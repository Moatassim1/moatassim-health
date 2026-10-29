// Fast food and takeaway menus used across the UK and Europe, per item as served.
// Values follow each chain's published nutrition (UK menus where a chain publishes several),
// checked against public restaurant listings where possible; items marked "typical" use typical
// values for that kind of dish. Recipes and portions differ a little between countries.
// Built in, so they work offline and need no search. Searchable by chain, item and dish type.
(function () {
  const K = ['kcal', 'p', 'c', 'f', 'fib', 'sug', 'sat', 'na', 'k', 'ca', 'fe', 'mg', 'zn', 'va', 'vc', 'vd', 've', 'vk', 'b6', 'b12', 'fol', 'se', 'io', 'ph', 'cu', 'b1', 'b2', 'b3', 'ch', 'epa', 'la', 'ala'];
  let n = 0;
  // F(chain, item, grams, one, [kcal, protein, carbs, fat, sat, sugar, fibre, salt], keywords, ml?)
  const F = (chain, item, g, one, v, kw, ml, typical) => {
    const [kcal, p, c, f, sat, sug, fib, salt] = v, per = 100 / g, nn = {};
    for (const k of K) nn[k] = null;
    const put = (k, x) => { if (x != null) nn[k] = Math.round(x * per * 100) / 100; };
    put('kcal', kcal); put('p', p); put('c', c); put('f', f); put('sat', sat); put('sug', sug); put('fib', fib); if (salt != null) nn.na = Math.round(salt * 400 * per);
    n++;
    return { id: 'ff' + n, name: `${item} (${chain})`, cat: 'Fast food', brand: chain, kw: kw || '', portion: g, portionLabel: '1 ' + one, n: nn,
      each: { g, one, many: one.endsWith('s') ? one : one + 's' }, ...(ml ? { unit: 'ml' } : {}), ...(typical ? { typical: true } : {}) };
  };
  const L = [];
  const add = (chain, kw, rows) => rows.forEach(r => L.push(F(chain, r[0], r[1], r[2], r[3], (kw + ' ' + (r[4] || '')).replace(/\btypical\b/g, '').trim(), r[5], /\btypical\b/.test(kw + ' ' + (r[4] || '')))));

  add("McDonald's", 'mcdonalds maccies mcd burger fast food', [
    ['Big Mac', 219, 'burger', [509, 27, 41, 25, 10, 9, 3.4, 2.3]],
    ['Quarter Pounder with Cheese', 200, 'burger', [514, 31, 36, 27, 13, 8, 2.5, 2.4], 'qpc'],
    ['Double Quarter Pounder with Cheese', 280, 'burger', [749, 48, 37, 44, 21, 9, 2.6, 3.2], 'dqpc'],
    ['Cheeseburger', 118, 'burger', [303, 16, 30, 13, 6.2, 6.6, 1.6, 1.5]],
    ['Double Cheeseburger', 165, 'burger', [452, 27, 31, 24, 11, 7, 1.7, 2.3]],
    ['Hamburger', 104, 'burger', [250, 13, 30, 8.5, 3.3, 6, 1.6, 1.1]],
    ['McChicken Sandwich', 167, 'burger', [371, 17, 40, 15, 1.7, 5, 2.5, 1.5]],
    ['Mayo Chicken', 116, 'burger', [282, 12, 36, 9.4, 1, 3.5, 2, 1.2]],
    ['McCrispy', 211, 'burger', [484, 27, 49, 20, 2.6, 5, 2.8, 2.2], 'chicken'],
    ['Filet-O-Fish', 134, 'burger', [329, 15, 35, 14, 3, 3.5, 1.6, 1.3], 'fish'],
    ['Chicken McNuggets (6)', 96, 'box', [261, 15, 21, 13, 1.4, 0.4, 1.2, 0.8], 'nuggets'],
    ['Chicken McNuggets (9)', 144, 'box', [391, 23, 31, 19, 2.1, 0.6, 1.8, 1.2], 'nuggets'],
    ['Chicken McNuggets (20)', 320, 'box', [870, 50, 70, 43, 4.7, 1.3, 4, 2.7], 'nuggets sharebox'],
    ['Chicken Selects (3)', 135, 'box', [336, 24, 24, 16, 1.6, 0.5, 1.5, 1.6]],
    ['Chicken Selects (5)', 225, 'box', [560, 40, 40, 27, 2.7, 0.8, 2.5, 2.7]],
    ['Fries (small)', 80, 'portion', [237, 2.3, 29, 12, 1.1, 0.2, 2.6, 0.4], 'chips'],
    ['Fries (medium)', 114, 'portion', [337, 5, 43, 15, 1.4, 0.3, 3.8, 0.6], 'chips'],
    ['Fries (large)', 150, 'portion', [444, 5.6, 55, 22, 2, 0.4, 5, 0.8], 'chips'],
    ['Hash Brown', 53, 'hash brown', [127, 1.1, 13, 7.4, 0.7, 0.3, 1.4, 0.5], 'breakfast'],
    ['Sausage & Egg McMuffin', 172, 'muffin', [424, 23, 27, 24, 10, 2, 2, 2], 'breakfast'],
    ['Double Sausage & Egg McMuffin', 228, 'muffin', [552, 32, 27, 35, 14, 2, 2, 2.6], 'breakfast'],
    ['Egg McMuffin', 135, 'muffin', [300, 18, 28, 12, 5.5, 2, 2, 1.8], 'breakfast'],
    ['Bacon Roll', 120, 'roll', [300, 16, 39, 8.5, 3, 4, 2, 2.4], 'breakfast'],
    ['Cheesy Bacon Flatbread', 120, 'flatbread', [280, 14, 31, 11, 5.5, 2.5, 1.8, 1.9], 'breakfast'],
    ['Smarties McFlurry (regular)', 172, 'McFlurry', [273, 6, 42, 9, 6, 38, 0.5, 0.3], 'ice cream dessert'],
    ['Milkshake (medium)', 300, 'shake', [346, 9, 58, 9, 6, 54, 0, 0.5], 'typical', true],
    ['Coca-Cola (medium)', 400, 'drink', [170, 0, 42, 0, 0, 42, 0, 0], 'coke', true],
  ]);
  add('Burger King', 'bk burgerking burger fast food', [
    ['Whopper', 270, 'burger', [621, 30, 45, 35, 11, 10, 3, 2.3]],
    ['Whopper with Cheese', 295, 'burger', [710, 34, 46, 42, 16, 10, 3, 2.9]],
    ['Double Whopper', 360, 'burger', [880, 52, 46, 53, 19, 11, 3, 2.7]],
    ['Whopper Jr.', 155, 'burger', [335, 16, 31, 16, 5, 7, 2, 1.3]],
    ['Plant-Based Whopper', 270, 'burger', [560, 20, 52, 30, 7, 10, 5, 2.4], 'vegan'],
    ['Bacon Double Cheese XL', 300, 'burger', [860, 52, 41, 54, 23, 9, 2, 3.8]],
    ['Big King', 210, 'burger', [512, 29, 37, 28, 11, 8, 2, 2.2]],
    ['Cheeseburger', 125, 'burger', [300, 15, 30, 13, 6, 7, 1.5, 1.6]],
    ['Chicken Royale', 215, 'burger', [570, 26, 53, 28, 3.6, 5, 3, 2.3]],
    ['Chicken Nuggets (9)', 150, 'box', [400, 20, 30, 22, 2.5, 0.5, 2, 1.6], 'nuggets'],
    ['Fries (regular)', 116, 'portion', [315, 3.6, 40, 15, 1.4, 0.3, 3.5, 0.7], 'chips'],
    ['Fries (large)', 154, 'portion', [418, 4.8, 53, 20, 1.9, 0.4, 4.6, 0.9], 'chips'],
    ['Onion Rings (9)', 105, 'portion', [320, 4.5, 37, 17, 1.5, 4, 3, 1.2]],
  ]);
  add('KFC', 'kfc kentucky fried chicken fast food', [
    ['Original Recipe drumstick', 90, 'piece', [179, 14, 8, 10, 2.1, 0, 0.6, 1.1], 'chicken piece'],
    ['Original Recipe thigh', 125, 'piece', [268, 20, 8.2, 17, 3.5, 0, 0.7, 1.4], 'chicken piece'],
    ['Original Recipe wing', 85, 'piece', [182, 16, 6.8, 10.3, 2.1, 0, 0.5, 1.1], 'chicken piece'],
    ['Original Recipe rib (breast)', 125, 'piece', [246, 26, 7, 12.5, 2.4, 0, 0.6, 1.6], 'chicken piece breast typical'],
    ['Hot Wing', 40, 'wing', [91, 4.9, 3.8, 6.2, 1.1, 0, 0.3, 0.4]],
    ['Popcorn Chicken (small)', 60, 'portion', [140, 9.5, 7.8, 7.7, 1, 0.2, 0.6, 0.8]],
    ['Popcorn Chicken (regular)', 130, 'portion', [307, 18, 18, 18, 2.2, 0.4, 1.3, 1.8]],
    ['Popcorn Chicken (large)', 200, 'portion', [478, 28, 28, 28, 3.4, 0.6, 2, 2.8]],
    ['Zinger Burger', 210, 'burger', [420, 25.8, 40.9, 17.6, 2.3, 5, 2.4, 2.1]],
    ['Fillet Burger', 210, 'burger', [455, 29.6, 44.8, 19.2, 2.4, 5, 2.4, 2.4]],
    ['Mini Fillet Burger', 130, 'burger', [277, 18, 28, 10, 1.3, 3, 1.5, 1.6]],
    ['Zinger Tower Burger', 280, 'burger', [615, 29.6, 52.4, 32.9, 7, 6, 3, 3]],
    ['Fillet Tower Burger', 280, 'burger', [605, 33.4, 58.1, 28, 6.5, 6, 3, 3.1]],
    ["Flamin' Mini Wrap", 140, 'wrap', [335, 18, 29, 16, 2.6, 2, 1.8, 1.7]],
    ['Twister Wrap', 230, 'wrap', [520, 26, 50, 24, 4, 4, 3, 2.6], 'typical'],
    ['Zinger Ranch Rice Bowl', 380, 'bowl', [551, 23, 65, 21, 3, 4, 3, 2.6]],
    ['Original Ranch Rice Bowl', 380, 'bowl', [547, 28, 63, 19, 3, 4, 3, 2.7]],
    ['Fries (regular)', 110, 'portion', [250, 3, 32, 12, 1.2, 0.3, 3, 0.6], 'chips typical'],
    ['Fries (large)', 150, 'portion', [340, 4.1, 44, 16, 1.6, 0.4, 4, 0.8], 'chips typical'],
    ['Gravy (regular)', 140, 'pot', [73, 1.7, 8.4, 3.5, 0.6, 0.4, 0.3, 1.2], 'sauce'],
    ['Corn Cobette', 80, 'cobette', [57, 2.2, 8.1, 1.3, 0.2, 2, 1.6, 0], 'corn'],
    ['BBQ Beans (regular)', 120, 'pot', [93, 4.7, 15, 0.6, 0.1, 6, 4, 0.9], 'beans'],
    ['Coleslaw (regular)', 100, 'pot', [150, 1.1, 6, 13, 1.1, 5, 1.2, 0.4]],
    ['Krushems Oreo shake', 300, 'shake', [272, 4.1, 41, 10, 6, 34, 0.5, 0.4], 'milkshake dessert', true],
  ]);
  add("Nando's", 'nandos peri peri piri piri chicken grill portuguese', [
    ['1/4 chicken (leg or breast)', 180, 'portion', [289, 39.3, 0.3, 14.5, 4, 0.3, 0, 1.4], 'quarter'],
    ['1/2 chicken', 360, 'portion', [579, 78.7, 0.6, 29.1, 8, 0.6, 0, 2.8], 'half'],
    ['Whole chicken', 720, 'portion', [1158, 157.4, 1.2, 58.2, 16, 1.2, 0, 5.6], 'whole'],
    ['Chicken butterfly', 200, 'portion', [186, 34.4, 3, 3.5, 1, 1, 0, 1.2], 'breast'],
    ['5 chicken wings', 150, 'portion', [393, 40, 1, 25, 7, 0.5, 0, 1.8], 'wings typical'],
    ['10 chicken wings', 300, 'portion', [786, 80, 2, 50, 14, 1, 0, 3.6], 'wings typical'],
    ['4 boneless chicken thighs', 280, 'portion', [706, 70, 3, 46, 13, 1, 0, 2.6], 'thighs'],
    ['Grilled chicken wrap', 290, 'wrap', [556, 36.8, 62.8, 17.2, 4, 5, 4, 2.4]],
    ['Grilled chicken burger (breast fillet)', 260, 'burger', [448, 40, 42, 13, 3, 6, 3, 2], 'butterfly burger'],
    ['Nandino burger (kids)', 170, 'burger', [285, 31.4, 27.5, 6, 1.5, 4, 2, 1.1], 'kids'],
    ['Garlic churrasco burger', 330, 'burger', [794, 49, 55.3, 39.9, 12, 6, 3, 3.2]],
    ['The Great Imitator wrap (veggie)', 300, 'wrap', [597, 25.9, 63.6, 26, 5, 5, 6, 2.6], 'vegan vegetarian'],
    ['Halloumi (grilled)', 80, 'portion', [267, 19, 1.5, 21, 14, 1, 0, 2.2], 'cheese'],
    ['Peri-salted chips (regular)', 190, 'portion', [450, 6.6, 68.9, 18, 1.6, 0.8, 6, 1.2], 'chips fries'],
    ['Peri-salted chips (large)', 470, 'portion', [1125, 16.6, 172.2, 45.2, 4, 2, 15, 3], 'chips fries'],
    ['Chips (regular)', 190, 'portion', [496, 6.6, 69, 21, 1.8, 0.8, 6, 0.5], 'fries'],
    ['Spicy rice (regular)', 180, 'portion', [246, 3.8, 42.2, 6, 0.8, 2, 1.5, 1], 'rice'],
    ['Garlic bread (regular)', 110, 'portion', [365, 5.9, 51.8, 15.4, 7, 2, 2.5, 1.2]],
    ['Creamy mash (regular)', 200, 'portion', [308, 4.5, 30, 19, 11, 2, 2.5, 0.8], 'mashed potato'],
    ['Macho peas (regular)', 160, 'portion', [155, 8, 15, 6.5, 2, 4, 7, 0.6], 'peas'],
    ['Corn on the cob (regular)', 150, 'portion', [142, 4.5, 21, 4.5, 2, 6, 3, 0.2], 'corn'],
    ['Rainbow slaw (regular)', 140, 'portion', [132, 1.5, 8, 10, 1, 7, 2, 0.5], 'coleslaw'],
    ['Long-stem broccoli', 80, 'portion', [32, 2.1, 3.7, 1.5, 0.2, 1.5, 2.5, 0.1], 'broccoli'],
    ['PERi mac & cheese', 250, 'portion', [494, 21, 46, 25.5, 14, 4, 2, 2]],
    ['Perinaise (dip)', 15, 'pot', [48, 0.1, 2, 4.5, 0.4, 1, 0, 0.2], 'sauce mayo'],
    ['Pastel de nata', 60, 'tart', [224, 3.1, 26.4, 11.2, 5, 14, 0.5, 0.2], 'dessert custard tart'],
  ]);
  // Independent piri piri / peri peri and fried chicken shops (Chicken Cottage, Dixy, Peri Peri shops…): typical values.
  add('Peri peri shop', 'piri piri peri peri chicken shop takeaway grill typical', [
    ['Quarter chicken, grilled', 200, 'portion', [320, 42, 1.5, 16, 4.5, 0.5, 0, 1.6], 'quarter'],
    ['Half chicken, grilled', 400, 'portion', [640, 84, 3, 32, 9, 1, 0, 3.2], 'half'],
    ['Whole chicken, grilled', 800, 'portion', [1280, 168, 6, 64, 18, 2, 0, 6.4], 'whole'],
    ['Peri wings (6)', 180, 'portion', [430, 42, 2, 28, 8, 1, 0, 2], 'wings'],
    ['Peri chicken wrap', 300, 'wrap', [590, 36, 60, 22, 5, 5, 4, 2.6]],
    ['Peri chicken burger', 270, 'burger', [560, 38, 46, 24, 5, 6, 3, 2.4]],
    ['Peri chicken rice box', 450, 'box', [700, 45, 85, 18, 4, 4, 3, 2.8], 'rice'],
    ['Peri chips (regular)', 170, 'portion', [430, 5.5, 58, 20, 2, 0.5, 5, 1.4], 'chips fries'],
    ['Peri chips (large)', 260, 'portion', [660, 8.5, 89, 30, 3, 0.8, 7.5, 2.1], 'chips fries'],
    ['Garlic mayo / peri mayo', 30, 'pot', [190, 0.3, 1.5, 20, 1.6, 1, 0, 0.4], 'sauce'],
  ]);
  add('Chicken shop', 'fried chicken shop takeaway chicken cottage dixy typical', [
    ['Fried chicken piece (thigh or breast)', 130, 'piece', [330, 24, 11, 21, 4.5, 0, 0.6, 1.4], 'piece'],
    ['Fried chicken wing', 45, 'wing', [140, 9, 5, 9.5, 2, 0, 0.2, 0.5], 'wing'],
    ['2 pc chicken & chips', 420, 'meal', [1050, 52, 85, 56, 10, 1, 7, 3.4], 'meal'],
    ['Chicken fillet burger', 220, 'burger', [520, 26, 48, 25, 4, 5, 2.5, 2.2]],
    ['Chicken nuggets (6)', 110, 'portion', [290, 15, 20, 17, 2.5, 0.5, 1, 1.2], 'nuggets'],
    ['Chicken strips (3)', 130, 'portion', [340, 26, 18, 18, 2.8, 0.5, 1, 1.6], 'strips tenders'],
    ['Chips (regular)', 180, 'portion', [430, 5.5, 58, 20, 2, 0.5, 5, 0.7], 'fries'],
  ]);
  add('Subway', 'subway sub sandwich footlong', [
    ['Chicken Teriyaki 6-inch', 255, 'sub', [367, 26, 50, 5.4, 1.3, 14, 4, 2.2], 'six inch'],
    ['Chicken Teriyaki footlong', 510, 'sub', [734, 52, 100, 10.8, 2.6, 28, 8, 4.4]],
    ['Meatball Marinara 6-inch', 270, 'sub', [459, 21, 55, 16, 6.5, 13, 5, 2.7], 'six inch'],
    ['Meatball Marinara footlong', 540, 'sub', [918, 42, 110, 32, 13, 26, 10, 5.4]],
    ['Italian B.M.T. 6-inch', 230, 'sub', [400, 20, 45, 15, 5.5, 6, 4, 2.9], 'bmt six inch'],
    ['Tuna 6-inch', 240, 'sub', [470, 19, 44, 24, 4, 6, 4, 1.8], 'six inch'],
    ['Turkey Breast 6-inch', 225, 'sub', [270, 18, 44, 3, 0.8, 6, 4, 1.8], 'six inch'],
    ['Steak & Cheese 6-inch', 250, 'sub', [380, 26, 44, 11, 5, 7, 4, 2.3], 'six inch'],
    ['Veggie Delite 6-inch', 165, 'sub', [210, 8, 40, 2.5, 0.5, 5, 4, 1], 'vegetarian six inch'],
    ['Cookie', 45, 'cookie', [210, 2.3, 28, 10, 5, 17, 1, 0.3], 'dessert'],
  ]);
  add("Domino's", 'dominos pizza takeaway', [
    ['Pepperoni Passion, medium (1 slice)', 82, 'slice', [210, 9.5, 20, 10, 4.5, 1.5, 1, 1.2], 'pepperoni pizza slice'],
    ['Pepperoni Passion, large (1 slice)', 95, 'slice', [245, 11, 23.5, 11.5, 5.2, 1.8, 1.1, 1.4], 'pepperoni pizza slice'],
    ['Margherita, medium (1 slice)', 70, 'slice', [160, 7, 21, 5, 2.8, 1.5, 1, 0.8], 'cheese pizza slice'],
    ['Margherita, large (1 slice)', 82, 'slice', [190, 8.3, 25, 6, 3.3, 1.8, 1.2, 0.95], 'cheese pizza slice'],
    ['Mighty Meaty, medium (1 slice)', 92, 'slice', [225, 11.5, 21, 10.5, 4.8, 1.8, 1.1, 1.4], 'meat pizza slice'],
    ['Vegi Supreme, medium (1 slice)', 85, 'slice', [165, 6.5, 22, 5.5, 2.8, 2.2, 1.6, 0.8], 'vegetable pizza slice'],
    ['Chicken Wings (7)', 175, 'portion', [430, 40, 3, 28, 7, 1, 0.5, 2.4], 'wings'],
    ['Garlic Pizza Bread', 150, 'portion', [490, 13, 62, 21, 9, 3, 3, 2], 'garlic bread'],
    ['Potato Wedges', 160, 'portion', [270, 4.5, 40, 10, 1, 0.5, 4, 1.2]],
    ['Cookies (4)', 100, 'box', [460, 5, 60, 22, 11, 35, 2, 0.5], 'dessert'],
  ]);
  add('Pizza Hut', 'pizza hut pizzahut', [
    ['Pepperoni, medium pan (1 slice)', 95, 'slice', [260, 11, 25, 13, 5, 2, 1.3, 1.3], 'pizza slice'],
    ['Margherita, medium pan (1 slice)', 85, 'slice', [215, 9, 25, 9, 4, 2, 1.3, 1], 'cheese pizza slice'],
    ['Chicken Supreme, medium pan (1 slice)', 100, 'slice', [235, 12, 26, 9, 3.6, 2.5, 1.5, 1.2], 'pizza slice'],
    ['Garlic Bread (4 pieces)', 120, 'portion', [400, 9, 52, 17, 6, 2.5, 2.5, 1.4]],
  ]);
  add('Five Guys', 'five guys 5 guys burger fries', [
    ['Hamburger (2 patties)', 265, 'burger', [700, 39, 39, 43, 19.5, 8, 2, 1.4], 'burger'],
    ['Cheeseburger (2 patties)', 303, 'burger', [840, 47, 40, 55, 26.5, 9, 2, 2.6]],
    ['Bacon Cheeseburger', 317, 'burger', [920, 51, 40, 62, 29.5, 9, 2, 3.2]],
    ['Little Hamburger (1 patty)', 180, 'burger', [480, 23, 39, 26, 11.5, 8, 2, 1.1]],
    ['Little Cheeseburger', 199, 'burger', [550, 27, 40, 32, 15, 9, 2, 1.7]],
    ['Hot Dog', 180, 'hot dog', [520, 18, 40, 33, 15, 8, 2, 3.2]],
    ['Fries (little)', 227, 'portion', [526, 8, 72, 23, 4, 1, 6.5, 0.1], 'chips'],
    ['Fries (regular)', 411, 'portion', [953, 14, 131, 41, 7.5, 2, 12, 0.2], 'chips'],
    ['Milkshake', 450, 'shake', [670, 13, 80, 33, 21, 78, 0, 0.8], 'shake', true],
  ]);
  add('Greggs', 'greggs bakery sausage roll', [
    ['Sausage roll', 103, 'roll', [338, 8.9, 23, 23, 11, 1, 1.5, 1.4]],
    ['Vegan sausage roll', 101, 'roll', [271, 11, 23, 14, 7, 1, 3, 1.4], 'vegan'],
    ['Steak bake', 136, 'bake', [428, 15, 30, 27, 13, 1.5, 1.5, 1.4]],
    ['Chicken bake', 150, 'bake', [426, 13, 32, 27, 13, 1.5, 1.5, 1.3]],
    ['Sausage, bean & cheese melt', 142, 'melt', [430, 13, 33, 27, 13, 3, 2, 1.7], 'typical'],
    ['Bacon breakfast roll', 120, 'roll', [321, 19, 33, 12, 4.5, 3, 2, 2.2], 'breakfast'],
    ['Sausage breakfast roll', 140, 'roll', [380, 15, 36, 19, 7, 3, 2, 2], 'breakfast typical'],
    ['Ham & cheese baguette', 196, 'baguette', [484, 27, 57, 16, 8.5, 3, 3, 3]],
    ['Tuna crunch baguette', 236, 'baguette', [413, 26, 64, 5.2, 1, 4, 4, 2.2]],
    ['Southern fried potato wedges', 150, 'portion', [279, 4.1, 42, 9.6, 1, 0.5, 4, 1.2]],
    ['Margherita pizza slice', 160, 'slice', [538, 19, 56, 26, 11, 4, 3, 2.3]],
    ['Pepperoni pizza slice', 172, 'slice', [611, 21, 57, 33, 14, 4, 3, 2.9]],
    ['Glazed ring doughnut', 54, 'doughnut', [190, 3, 23, 9.5, 4.5, 9, 1, 0.3], 'donut dessert'],
    ['Yum yum', 70, 'yum yum', [290, 3, 32, 17, 8, 14, 1, 0.3], 'pastry dessert'],
  ]);
  add('Pret', 'pret a manger cafe sandwich', [
    ['Classic super club sandwich', 240, 'sandwich', [520, 33, 41, 24, 5.5, 5, 4, 2.4], 'typical'],
    ['Tuna mayo baguette', 220, 'baguette', [500, 26, 56, 18, 2.6, 4, 3.5, 2], 'typical'],
    ['Avocado & chipotle wrap', 230, 'wrap', [480, 13, 49, 26, 5, 6, 8, 1.6], 'vegan typical'],
    ['Almond croissant', 105, 'croissant', [430, 9, 38, 27, 12, 15, 2.5, 0.5], 'pastry typical'],
    ['Porridge', 300, 'bowl', [260, 9, 36, 8, 4.5, 11, 4, 0.2], 'oats breakfast typical'],
  ]);
  add('Starbucks', 'starbucks coffee cafe', [
    ['Latte, semi-skimmed (tall)', 354, 'cup', [130, 9, 13, 4.5, 3, 12, 0, 0.3], 'coffee', true],
    ['Latte, semi-skimmed (grande)', 473, 'cup', [170, 12, 17, 6, 4, 16, 0, 0.4], 'coffee', true],
    ['Cappuccino, semi-skimmed (grande)', 473, 'cup', [120, 8, 12, 4.5, 3, 11, 0, 0.3], 'coffee', true],
    ['Flat white, semi-skimmed', 354, 'cup', [110, 7.5, 10.5, 4, 2.6, 10, 0, 0.2], 'coffee', true],
    ['Caramel Macchiato, semi-skimmed (grande)', 473, 'cup', [220, 10, 32, 6, 4, 30, 0, 0.4], 'coffee', true],
    ['Caramel Frappuccino (grande)', 473, 'cup', [380, 5, 60, 14, 9, 58, 0, 0.6], 'frappe', true],
    ['Chocolate chip cookie', 85, 'cookie', [400, 4.5, 51, 19, 11, 30, 2, 0.6], 'dessert typical'],
    ['Croissant', 70, 'croissant', [280, 5.5, 29, 15.5, 9.5, 5, 1.5, 0.6], 'pastry'],
  ]);
  add('Costa', 'costa coffee cafe', [
    ['Latte, semi-skimmed (medium)', 400, 'cup', [144, 10, 14.5, 5.2, 3.3, 14, 0, 0.3], 'coffee', true],
    ['Cappuccino, semi-skimmed (medium)', 400, 'cup', [104, 7, 10.5, 3.8, 2.4, 10, 0, 0.2], 'coffee', true],
    ['Flat white, semi-skimmed', 230, 'cup', [90, 6, 9, 3.3, 2.1, 9, 0, 0.2], 'coffee', true],
    ['Hot chocolate, semi-skimmed (medium)', 400, 'cup', [250, 11, 36, 7, 4.5, 33, 1.5, 0.4], 'chocolate', true],
    ['Toastie, ham & cheese', 170, 'toastie', [420, 25, 40, 17, 9, 3, 2, 2.6], 'typical'],
  ]);
  add('Taco Bell', 'taco bell mexican', [
    ['Crunchy taco (beef)', 78, 'taco', [170, 8, 13, 10, 3.5, 1, 3, 0.7]],
    ['Burrito Supreme (beef)', 250, 'burrito', [390, 16, 51, 14, 6, 4, 8, 2.3]],
    ['Crunchwrap Supreme', 254, 'crunchwrap', [530, 16, 71, 21, 6, 6, 6, 3]],
    ['Chicken quesadilla', 180, 'quesadilla', [510, 27, 37, 27, 12, 3, 3, 3]],
    ['Nachos BellGrande', 310, 'portion', [740, 16, 82, 38, 7, 5, 12, 2.7], 'nachos'],
  ]);
  add('Popeyes', 'popeyes fried chicken', [
    ['Classic chicken sandwich', 230, 'sandwich', [700, 28, 50, 42, 14, 9, 2, 3.4], 'burger'],
    ['Chicken tenders (3)', 150, 'portion', [440, 37, 22, 22, 9, 0, 1, 3], 'strips'],
    ['Cajun fries (regular)', 110, 'portion', [270, 4, 35, 13, 5, 0, 3, 1.3], 'chips'],
  ]);
  add('Wingstop', 'wingstop wings', [
    ['Classic wings (6)', 200, 'portion', [540, 48, 0, 38, 11, 0, 0, 3.2], 'chicken wings'],
    ['Boneless wings (6)', 180, 'portion', [500, 30, 30, 28, 5, 1, 1, 3], 'chicken'],
    ['Seasoned fries (regular)', 170, 'portion', [430, 6, 56, 21, 3.5, 0.5, 5, 1.6], 'chips'],
  ]);
  add("Wendy's", 'wendys burger', [
    ["Dave's Single", 260, 'burger', [590, 30, 39, 34, 13, 9, 2, 2.6]],
    ['Baconator', 300, 'burger', [960, 57, 38, 66, 25, 8, 1, 4.5]],
    ['Spicy chicken sandwich', 220, 'burger', [490, 28, 49, 20, 3.5, 6, 3, 2.7]],
    ['Fries (medium)', 140, 'portion', [350, 5, 47, 16, 3, 0, 4, 0.8], 'chips'],
  ]);
  add('German Doner Kebab', 'gdk german doner kebab doner', [
    ['Doner kebab (regular)', 380, 'kebab', [900, 48, 70, 46, 14, 8, 5, 5.2], 'typical'],
    ['Doner box (regular)', 450, 'box', [1050, 50, 75, 58, 16, 4, 6, 5], 'chips typical'],
    ['Doner wrap', 330, 'wrap', [770, 42, 60, 39, 12, 6, 4, 4.5], 'typical'],
  ]);
  add('Wagamama', 'wagamama japanese noodles katsu', [
    ['Chicken katsu curry', 560, 'plate', [1000, 45, 130, 34, 6, 15, 6, 3.8], 'curry'],
    ['Chicken ramen', 700, 'bowl', [560, 40, 65, 13, 3, 6, 4, 5.5], 'noodle soup'],
    ['Yaki soba (chicken & prawn)', 420, 'plate', [700, 35, 80, 25, 4, 15, 5, 4.4], 'noodles'],
    ['Pad thai (chicken & prawn)', 450, 'plate', [760, 40, 95, 24, 4, 25, 5, 4.4], 'noodles'],
    ['Chicken gyoza (5)', 120, 'portion', [260, 11, 28, 11, 2.5, 3, 2, 1.4], 'dumplings'],
  ]);
  add('Leon', 'leon healthy fast food', [
    ['Chicken aioli wrap', 250, 'wrap', [560, 30, 52, 25, 4, 4, 4, 2.2], 'typical'],
    ['Original superfood salad', 280, 'box', [380, 18, 28, 22, 3.5, 6, 8, 1.2], 'typical'],
    ['Baked fries (regular)', 140, 'portion', [250, 3.6, 36, 9.6, 1, 0.5, 3.5, 0.9], 'chips typical'],
  ]);
  add('Itsu', 'itsu sushi japanese', [
    ['Salmon & tuna sushi box', 240, 'box', [420, 22, 66, 7, 1.5, 9, 2, 2.2], 'typical'],
    ['Chicken teriyaki rice bowl', 400, 'bowl', [560, 30, 85, 10, 2, 15, 3, 3], 'typical'],
    ['Chicken noodle soup (pot)', 400, 'pot', [300, 18, 40, 7, 1.5, 6, 3, 3.5], 'gyoza typical'],
  ]);
  add('Tortilla', 'tortilla burrito mexican chipotle barburrito', [
    ['Chicken burrito (regular)', 450, 'burrito', [850, 45, 105, 26, 11, 6, 12, 4.2], 'typical'],
    ['Burrito bowl, chicken', 400, 'bowl', [560, 40, 60, 17, 6, 5, 11, 2.8], 'naked typical'],
    ['Nachos', 200, 'portion', [600, 10, 60, 36, 9, 2, 6, 1.4], 'typical'],
  ]);
  add('Pizza Express', 'pizzaexpress pizza express italian', [
    ['Margherita (classic)', 330, 'pizza', [690, 30, 92, 22, 11, 7, 5, 3.4], 'typical'],
    ['American (pepperoni, classic)', 370, 'pizza', [860, 38, 92, 37, 15, 7, 5, 4.4], 'typical'],
    ['Dough balls (8)', 150, 'portion', [390, 11, 63, 9.5, 5, 2, 3, 1.5], 'garlic butter typical'],
  ]);
  add('Krispy Kreme', 'krispy kreme doughnut donut', [
    ['Original glazed doughnut', 52, 'doughnut', [210, 2.5, 25, 11, 5.5, 12, 0.5, 0.3]],
    ['Chocolate iced glazed doughnut', 63, 'doughnut', [250, 3, 33, 12, 6, 18, 0.7, 0.3]],
  ]);
  add('Dunkin', 'dunkin donuts doughnut', [
    ['Glazed donut', 60, 'donut', [240, 4, 33, 11, 5, 13, 1, 0.8], 'doughnut'],
  ]);
  add('Tim Hortons', 'tim hortons timmies', [
    ['Original iced capp (medium)', 450, 'cup', [360, 5, 48, 17, 11, 45, 0, 0.3], 'coffee', true],
    ['Timbits (10)', 140, 'box', [560, 7, 76, 26, 12, 34, 2, 1.2], 'doughnut'],
  ]);
  // Europe
  add('Telepizza', 'telepizza pizza spain portugal', [
    ['Barbacoa, medium (1 slice)', 95, 'slice', [245, 11, 27, 10, 4.5, 3, 1.5, 1.3], 'bbq pizza slice typical'],
    ['Pepperoni, medium (1 slice)', 85, 'slice', [235, 10, 25, 10.5, 4.8, 2, 1.3, 1.3], 'pizza slice typical'],
  ]);
  add('Quick', 'quick burger belgium france', [
    ['Giant', 230, 'burger', [580, 28, 46, 31, 10, 9, 3, 2.4], 'typical'],
    ['Long Chicken', 200, 'burger', [560, 20, 55, 28, 3.5, 5, 3, 2.2], 'typical'],
  ]);
  add('Max', 'max burgers sweden', [
    ['Original burger', 210, 'burger', [520, 26, 40, 28, 11, 8, 2, 2.2], 'typical'],
  ]);
  add('Hesburger', 'hesburger finland baltics', [
    ['Cheeseburger', 130, 'burger', [330, 16, 31, 15, 6, 6, 1.5, 1.6], 'typical'],
    ['Kerroshampurilainen (double)', 260, 'burger', [620, 31, 43, 36, 13, 8, 2, 2.6], 'typical double burger'],
  ]);
  add('Nordsee', 'nordsee fish germany austria', [
    ['Backfisch baguette', 230, 'baguette', [560, 22, 58, 26, 3, 5, 3, 2.4], 'fish typical'],
    ['Fish & chips', 400, 'portion', [880, 32, 85, 45, 5, 2, 7, 2.4], 'typical'],
  ]);
  add('Vapiano', 'vapiano pasta italian', [
    ['Spaghetti bolognese', 450, 'plate', [690, 30, 92, 22, 8, 10, 6, 3], 'typical'],
    ['Penne arrabbiata', 400, 'plate', [560, 17, 96, 12, 2, 10, 6, 2.6], 'typical'],
    ['Carbonara', 420, 'plate', [860, 33, 90, 40, 18, 5, 4, 3.4], 'typical'],
  ]);
  // Takeaway dishes found everywhere in Europe (typical values)
  add('Kebab shop', 'kebab doner shawarma takeaway turkish typical', [
    ['Doner kebab in pitta (lamb)', 350, 'kebab', [850, 40, 60, 50, 22, 6, 4, 4.5]],
    ['Doner kebab in pitta (chicken)', 350, 'kebab', [650, 45, 60, 25, 6, 6, 4, 4]],
    ['Döner box with chips', 500, 'box', [1150, 50, 85, 68, 25, 4, 7, 5], 'kapsalon'],
    ['Chicken shish kebab with rice', 450, 'plate', [700, 50, 80, 18, 4, 4, 3, 3]],
    ['Lahmacun', 200, 'lahmacun', [450, 18, 60, 15, 5, 5, 4, 2.4], 'turkish pizza'],
    ['Falafel wrap', 300, 'wrap', [600, 16, 70, 28, 4, 6, 10, 2.6], 'vegetarian vegan'],
    ['Chicken shawarma wrap', 300, 'wrap', [620, 38, 55, 26, 5, 4, 3, 3]],
    ['Gyros pita', 330, 'pita', [700, 32, 62, 36, 12, 5, 4, 3], 'greek'],
    ['Souvlaki pita (pork)', 280, 'pita', [560, 30, 58, 22, 6, 4, 3, 2.4], 'greek'],
  ]);
  add('Chip shop', 'fish and chips chippy takeaway typical', [
    ['Battered cod & chips (regular)', 550, 'portion', [1100, 45, 115, 50, 5, 2, 9, 2]],
    ['Chips (regular)', 300, 'portion', [600, 9, 90, 24, 2.4, 1, 8, 0.6], 'fries'],
    ['Battered sausage', 120, 'sausage', [370, 11, 23, 26, 9, 1, 1, 2]],
    ['Mushy peas', 120, 'portion', [100, 6, 15, 1, 0.1, 2, 5, 0.5]],
    ['Curry sauce', 100, 'pot', [100, 1.5, 12, 5, 0.8, 4, 1, 1]],
  ]);
  add('Street food', 'europe takeaway snack typical', [
    ['French tacos (chicken, chips & cheese)', 450, 'taco', [1100, 50, 95, 58, 22, 5, 5, 5], 'france o tacos'],
    ['Currywurst with fries', 450, 'portion', [950, 25, 80, 58, 18, 18, 7, 4], 'germany'],
    ['Bratwurst in a roll', 180, 'roll', [480, 18, 34, 30, 11, 4, 2, 2.2], 'germany sausage'],
    ['Croque monsieur', 200, 'croque', [520, 26, 38, 29, 16, 4, 2, 2.6], 'france toastie'],
    ['Crêpe with Nutella', 150, 'crêpe', [420, 8, 55, 18, 6, 30, 2, 0.4], 'crepe france dessert'],
    ['Belgian waffle', 100, 'waffle', [420, 6, 50, 21, 11, 25, 1.5, 0.6], 'dessert'],
    ['Patat met mayo (Dutch fries)', 250, 'portion', [700, 7, 72, 42, 4, 2, 7, 1.2], 'netherlands fries'],
    ['Bocadillo de jamón', 200, 'bocadillo', [480, 24, 58, 16, 5, 3, 3, 3.6], 'spain sandwich'],
    ['Pizza al taglio (1 slice)', 150, 'slice', [380, 14, 50, 13, 5, 4, 3, 1.6], 'italy pizza'],
    ['Panzerotto', 200, 'panzerotto', [560, 18, 55, 30, 10, 4, 3, 2], 'italy'],
    ['Zapiekanka', 300, 'zapiekanka', [650, 25, 75, 28, 12, 6, 4, 3], 'poland'],
    ['Langos with sour cream & cheese', 250, 'langos', [700, 18, 70, 40, 15, 5, 3, 1.8], 'hungary'],
  ]);
  window.BUILTIN_FOODS.push(...L);
  window.GG_FASTFOOD_CHAINS = [...new Set(L.map(f => f.brand))];
})();

// More fast food and restaurant chains: USA & Canada, more of Europe, and fuller menus for the big chains.
// Per item as served. Values follow each chain's published nutrition where known, otherwise typical values
// for that item; recipes and portions differ between countries. IDs are 'fx' + position: only ADD rows at
// the end of a chain or add new chains at the bottom, never reorder or delete (diary entries point at ids).
(function () {
  const K = ['kcal', 'p', 'c', 'f', 'fib', 'sug', 'sat', 'na', 'k', 'ca', 'fe', 'mg', 'zn', 'va', 'vc', 'vd', 've', 'vk', 'b6', 'b12', 'fol', 'se', 'io', 'ph', 'cu', 'b1', 'b2', 'b3', 'ch', 'epa', 'la', 'ala'];
  let n = 0;
  const REGION = window.GG_FF_REGION = window.GG_FF_REGION || {};
  const plural = one => /s$/.test(one) ? one : /(x|ch|sh)$/.test(one) ? one + 'es' : one + 's';
  // row: [item, grams, one, [kcal, protein, carbs, fat, sat, sugar, fibre, salt], keywords, ml]
  const F = (chain, item, g, one, v, kw, ml) => {
    const [kcal, p, c, f, sat, sug, fib, salt] = v, per = 100 / g, nn = {};
    for (const k of K) nn[k] = null;
    const put = (k, x) => { if (x != null) nn[k] = Math.round(x * per * 100) / 100; };
    put('kcal', kcal); put('p', p); put('c', c); put('f', f); put('sat', sat); put('sug', sug); put('fib', fib); if (salt != null) nn.na = Math.round(salt * 400 * per);
    n++;
    return { id: 'fx' + n, name: `${item} (${chain})`, cat: 'Fast food', brand: chain, kw: kw || '', portion: g, portionLabel: '1 ' + one, n: nn,
      each: { g, one, many: plural(one) }, ...(ml ? { unit: 'ml' } : {}) };
  };
  const L = [];
  const add = (chain, kw, region, rows) => { if (region) REGION[chain] = region; rows.forEach(r => L.push(F(chain, r[0], r[1], r[2], r[3], (kw + ' ' + (r[4] || '')).trim(), r[5]))); };
  // Chains already in fastfood.js
  Object.assign(REGION, { "McDonald's": 'all', 'Burger King': 'all', KFC: 'all', "Nando's": 'uk', 'Peri peri shop': 'take', 'Chicken shop': 'take', Subway: 'all', "Domino's": 'all', 'Pizza Hut': 'all', 'Five Guys': 'all', Greggs: 'uk', Pret: 'uk', Starbucks: 'all', Costa: 'uk', 'Taco Bell': 'all', Popeyes: 'all', Wingstop: 'all', "Wendy's": 'us', 'German Doner Kebab': 'uk', Wagamama: 'uk', Leon: 'uk', Itsu: 'uk', Tortilla: 'uk', 'Pizza Express': 'uk', 'Krispy Kreme': 'all', Dunkin: 'us', 'Tim Hortons': 'ca', Telepizza: 'eu', Quick: 'eu', Max: 'eu', Hesburger: 'eu', Nordsee: 'eu', Vapiano: 'eu', 'Kebab shop': 'take', 'Chip shop': 'take', 'Street food': 'take' });

  // ------------------------------------------------------------------ fuller menus for big chains
  add("McDonald's", 'mcdonalds maccies mcd burger fast food', '', [
    ['Egg McMuffin', 135, 'muffin', [290, 18, 28, 12, 5, 2.5, 1.8, 1.6], 'breakfast'],
    ['Sausage & Egg McMuffin', 170, 'muffin', [430, 23, 28, 25, 10, 2, 1.8, 2], 'breakfast'],
    ['Bacon & Egg McMuffin', 145, 'muffin', [340, 20, 28, 16, 6.5, 2.5, 1.8, 2.1], 'breakfast'],
    ['Double Sausage & Egg McMuffin', 215, 'muffin', [560, 32, 28, 36, 15, 2.5, 2, 2.6], 'breakfast'],
    ['Hash brown', 55, 'hash brown', [150, 1.4, 15, 9, 0.9, 0.2, 1.6, 0.5], 'breakfast potato'],
    ['Hotcakes with syrup', 225, 'portion', [540, 10, 95, 13, 4, 40, 2.5, 1.8], 'pancakes breakfast'],
    ['Breakfast wrap (sausage)', 240, 'wrap', [610, 30, 48, 32, 12, 4.5, 3, 3.4], 'breakfast'],
    ['Bacon roll with ketchup', 115, 'roll', [300, 18, 36, 9, 3.4, 5, 2, 2.4], 'breakfast'],
    ['Porridge (oatso simple)', 270, 'bowl', [230, 9, 30, 7.5, 3.5, 12, 2.5, 0.3], 'breakfast oats'],
    ['Triple Cheeseburger', 205, 'burger', [580, 36, 32, 33, 15, 7, 1.8, 3], ''],
    ['Big Tasty with bacon', 290, 'burger', [800, 44, 41, 51, 22, 8, 3, 3.6], ''],
    ['Big Mac (US)', 219, 'burger', [590, 25, 46, 34, 11, 9, 3, 2.6], 'usa'],
    ['Quarter Pounder with Cheese (US)', 202, 'burger', [520, 30, 42, 26, 13, 10, 2, 2.8], 'usa'],
    ['Double Quarter Pounder Deluxe', 330, 'burger', [800, 49, 44, 48, 21, 10, 3, 3.4], ''],
    ['McDouble', 151, 'burger', [400, 22, 33, 20, 9, 7, 1.5, 2.3], 'usa'],
    ['Spicy McCrispy', 211, 'burger', [530, 26, 48, 26, 4, 9, 2, 2.9], 'chicken'],
    ['Deluxe McCrispy', 250, 'burger', [530, 27, 51, 24, 4, 9, 2.5, 2.6], 'chicken'],
    ['Chicken Legend (cool mayo)', 220, 'burger', [520, 28, 55, 20, 2, 5, 3, 2.3], 'chicken'],
    ['Spicy Veggie One', 220, 'burger', [480, 13, 59, 21, 2, 6, 6, 2.1], 'vegetarian'],
    ['McPlant', 220, 'burger', [430, 17, 47, 19, 5, 9, 6, 2], 'vegan plant'],
    ['Veggie Dippers (4)', 140, 'portion', [340, 7, 40, 16, 1.5, 1.5, 5, 1.2], 'vegan'],
    ['Chicken McWrap / Wrap of the Day', 250, 'wrap', [530, 30, 50, 23, 4, 4, 3, 2.6], ''],
    ['Grilled chicken salad', 280, 'salad', [180, 26, 6, 5, 1.5, 4, 3, 1.1], 'healthy'],
    ['Side salad', 90, 'salad', [20, 1, 2.5, 0.3, 0.1, 2, 1.2, 0], ''],
    ['Carrot sticks', 80, 'bag', [30, 0.5, 6, 0.2, 0, 5, 2, 0], ''],
    ['Apple slices', 80, 'bag', [40, 0.3, 9, 0, 0, 8, 1.5, 0], 'fruit bag'],
    ['Mozzarella dippers (3)', 75, 'portion', [230, 10, 18, 13, 6, 1, 1, 1.1], ''],
    ['Fries (US medium)', 111, 'portion', [320, 5, 43, 15, 2, 0, 4, 0.7], 'usa chips'],
    ['McFlurry Oreo', 185, 'cup', [340, 7.5, 52, 11, 6.5, 44, 1, 0.4], 'ice cream dessert'],
    ['McFlurry Galaxy / Smarties', 180, 'cup', [350, 7, 54, 12, 7.5, 47, 1, 0.4], 'ice cream dessert'],
    ['Ice cream cone', 90, 'cone', [140, 3.5, 23, 3.5, 2.3, 18, 0.2, 0.2], 'dessert'],
    ['Sundae (strawberry)', 160, 'sundae', [230, 5, 40, 5.5, 3.6, 34, 0.3, 0.3], 'dessert'],
    ['Apple pie', 80, 'pie', [230, 2, 29, 12, 5, 13, 1.5, 0.4], 'dessert'],
    ['Cookie (milk chocolate)', 45, 'cookie', [210, 2.5, 28, 10, 5.5, 18, 1, 0.3], 'dessert'],
    ['Milkshake (medium, strawberry)', 400, 'shake', [390, 11, 65, 10, 6.5, 62, 0, 0.5], 'drink', 1],
    ['Milkshake (medium, chocolate)', 400, 'shake', [400, 11, 66, 10, 6.5, 62, 1, 0.5], 'drink', 1],
    ['Coca-Cola (medium)', 400, 'drink', [170, 0, 42, 0, 0, 42, 0, 0], 'drink coke', 1],
    ['Coca-Cola Zero (medium)', 400, 'drink', [1, 0, 0, 0, 0, 0, 0, 0], 'drink coke', 1],
    ['Fanta orange (medium)', 400, 'drink', [76, 0, 18, 0, 0, 18, 0, 0], 'drink', 1],
    ['Latte (medium)', 335, 'cup', [140, 9, 13, 6, 3.6, 13, 0, 0.3], 'mccafe coffee', 1],
    ['Cappuccino (medium)', 335, 'cup', [110, 7, 10, 4, 2.5, 10, 0, 0.2], 'mccafe coffee', 1],
    ['Iced frappé (caramel, medium)', 400, 'cup', [390, 6, 60, 14, 9, 55, 0, 0.4], 'mccafe coffee', 1],
    ['Hot chocolate (medium)', 335, 'cup', [200, 7, 30, 6, 4, 28, 1, 0.4], 'drink', 1],
    ['Orange juice (medium)', 250, 'drink', [110, 1.5, 25, 0, 0, 22, 0.5, 0], 'drink', 1],
    ['Sweet chilli sauce dip', 25, 'dip', [50, 0, 12, 0, 0, 11, 0, 0.4], 'sauce'],
    ['BBQ dip', 25, 'dip', [45, 0, 11, 0, 0, 9, 0, 0.5], 'sauce'],
    ['Sweet & sour dip', 25, 'dip', [45, 0, 11, 0, 0, 9, 0, 0.3], 'sauce'],
    ['Garlic & herb dip / mayo', 25, 'dip', [120, 0.3, 1.5, 12, 1, 1, 0, 0.3], 'sauce'],
  ]);
  add('Burger King', 'bk burgerking burger fast food', '', [
    ['Whopper', 290, 'burger', [630, 28, 51, 35, 10, 12, 3, 2.4], ''],
    ['Whopper with cheese', 315, 'burger', [720, 33, 52, 42, 15, 12, 3, 3], ''],
    ['Double Whopper', 370, 'burger', [880, 48, 51, 54, 18, 12, 3, 2.7], ''],
    ['Whopper Jr', 160, 'burger', [330, 15, 28, 18, 5, 7, 1.5, 1.2], ''],
    ['Plant-based Whopper', 290, 'burger', [580, 22, 54, 30, 6, 12, 5, 2.4], 'vegan'],
    ['Bacon Double Cheeseburger', 180, 'burger', [480, 30, 30, 27, 12, 6, 1.5, 2.6], ''],
    ['Cheeseburger', 125, 'burger', [300, 16, 29, 13, 6, 7, 1.5, 1.6], ''],
    ['Hamburger', 110, 'burger', [250, 13, 28, 9, 3.6, 6, 1.5, 1.2], ''],
    ['Long Chicken', 200, 'burger', [560, 20, 52, 30, 3.5, 4, 3, 2.1], 'chicken'],
    ['Chicken Royale', 230, 'burger', [600, 26, 55, 30, 3.5, 5, 3, 2.3], 'chicken'],
    ['Crispy Chicken', 190, 'burger', [450, 18, 45, 22, 3, 5, 2.5, 1.8], 'chicken'],
    ['Steakhouse burger', 310, 'burger', [800, 39, 56, 46, 18, 13, 3, 3.6], ''],
    ['Chicken Nuggets (9)', 150, 'box', [390, 19, 25, 24, 3.5, 0.3, 2, 1.5], ''],
    ['Onion rings (regular)', 90, 'portion', [260, 3.5, 30, 14, 1.5, 3, 2.5, 1.1], ''],
    ['Fries (regular)', 116, 'portion', [320, 4, 42, 15, 1.5, 0.3, 3.5, 0.7], 'chips'],
    ['Fries (large)', 150, 'portion', [420, 5, 55, 20, 2, 0.4, 4.5, 0.9], 'chips'],
    ['Halloumi fries', 100, 'portion', [320, 13, 18, 22, 10, 1, 1, 2.2], ''],
    ['Cheese bites (6)', 100, 'portion', [320, 10, 28, 19, 8, 2, 1.5, 1.6], ''],
    ['Croissan’wich (sausage, egg & cheese)', 165, 'sandwich', [500, 20, 27, 34, 14, 4, 1, 2.6], 'breakfast usa'],
    ['Hershey’s sundae pie', 79, 'slice', [310, 3, 32, 19, 12, 23, 1, 0.5], 'dessert'],
    ['Oreo shake (regular)', 400, 'shake', [600, 12, 90, 20, 13, 75, 1, 0.8], 'dessert', 1],
  ]);
  add('KFC', 'kfc kentucky fried chicken fast food', '', [
    ['Zinger Tower burger', 270, 'burger', [650, 33, 60, 30, 6, 6, 4, 3.4], ''],
    ['Fillet burger', 200, 'burger', [450, 28, 45, 17, 2.5, 5, 3, 2.2], ''],
    ['Twister wrap', 220, 'wrap', [520, 25, 52, 23, 4, 4, 3, 2.6], ''],
    ['Boneless banquet (2 fillets + fries)', 400, 'meal', [900, 50, 85, 40, 6, 3, 7, 4], ''],
    ['Popcorn chicken (regular)', 100, 'box', [280, 18, 16, 16, 2, 0.5, 1, 1.8], ''],
    ['Hot wings (3)', 90, 'portion', [250, 18, 8, 16, 3.5, 0.3, 0.5, 1.6], ''],
    ['Mini fillet (1)', 50, 'fillet', [110, 11, 7, 4, 0.6, 0.2, 0.5, 0.7], ''],
    ['Original Recipe chicken (1 piece)', 120, 'piece', [270, 23, 8, 16, 3.5, 0.2, 0.5, 1.6], 'drumstick thigh'],
    ['Extra Crispy chicken (1 piece)', 120, 'piece', [320, 22, 12, 20, 4, 0.2, 0.5, 1.6], 'usa'],
    ['Gravy (regular)', 150, 'pot', [100, 2, 12, 5, 1, 1, 0.5, 1.4], ''],
    ['Coleslaw (regular)', 110, 'pot', [150, 1, 10, 12, 1, 8, 1.5, 0.5], ''],
    ['Corn on the cob', 160, 'cob', [150, 5, 25, 3, 0.6, 7, 4, 0], ''],
    ['Beans (regular)', 150, 'pot', [110, 6, 18, 0.5, 0, 7, 5, 1], 'baked beans'],
    ['Mashed potato & gravy', 150, 'pot', [120, 2, 18, 4, 1.5, 1, 1.5, 1.2], 'usa'],
    ['Mac & cheese', 160, 'pot', [270, 9, 26, 14, 6, 3, 1, 1.6], 'usa'],
    ['Biscuit (US)', 60, 'biscuit', [180, 4, 23, 8, 6, 2, 1, 1.4], 'usa'],
    ['Fries (large)', 165, 'portion', [470, 6, 62, 22, 2, 0.5, 6, 1.5], 'chips'],
    ['Vegan burger', 240, 'burger', [480, 15, 55, 21, 2.5, 5, 6, 2.5], 'vegan plant'],
    ['Krushem (Oreo)', 350, 'cup', [450, 8, 62, 18, 10, 52, 1, 0.5], 'dessert'],
    ['Pepsi Max (regular)', 500, 'drink', [2, 0, 0, 0, 0, 0, 0, 0], 'drink', 1],
  ]);
  add('Subway', 'subway sub sandwich footlong', '', [
    ['Chicken Teriyaki 6-inch', 240, 'sub', [360, 25, 52, 5, 1, 13, 4, 2.3], ''],
    ['Chicken Tikka 6-inch', 230, 'sub', [320, 24, 42, 5, 1, 6, 4, 2], ''],
    ['Meatball Marinara 6-inch', 260, 'sub', [460, 21, 55, 17, 7, 11, 5, 2.6], ''],
    ['Italian B.M.T. 6-inch', 220, 'sub', [410, 19, 44, 17, 6, 6, 4, 3], ''],
    ['Steak & Cheese 6-inch', 240, 'sub', [380, 26, 44, 11, 5, 6, 4, 2.3], ''],
    ['Tuna 6-inch', 230, 'sub', [450, 18, 40, 23, 4, 5, 4, 1.7], ''],
    ['Turkey breast 6-inch', 220, 'sub', [270, 18, 42, 3, 0.7, 6, 4, 1.8], ''],
    ['Ham 6-inch', 220, 'sub', [270, 17, 42, 4, 1, 6, 4, 2], ''],
    ['Veggie Delite 6-inch', 170, 'sub', [210, 8, 39, 2.5, 0.4, 5, 4, 0.9], 'vegetarian'],
    ['Spicy Italian 6-inch', 220, 'sub', [470, 19, 43, 25, 9, 6, 4, 3.3], ''],
    ['Rotisserie-style chicken 6-inch', 230, 'sub', [320, 26, 41, 6, 1.5, 6, 4, 1.6], ''],
    ['Chicken & Bacon Ranch 6-inch', 250, 'sub', [520, 34, 43, 24, 8, 6, 4, 3], ''],
    ['Footlong (double any 6-inch)', 460, 'footlong', [740, 44, 90, 20, 6, 14, 8, 4.6], 'footlong'],
    ['Wrap (chicken tikka)', 260, 'wrap', [460, 30, 50, 15, 5, 4, 4, 2.8], ''],
    ['Salad (chicken)', 300, 'salad', [160, 22, 8, 4, 1, 5, 3, 1.2], 'healthy'],
    ['Cheese (extra, 2 slices)', 14, 'portion', [50, 3, 0.5, 4, 2.5, 0.3, 0, 0.3], ''],
    ['Sweet onion sauce', 21, 'portion', [40, 0, 9, 0, 0, 8, 0, 0.3], 'sauce'],
    ['Chipotle southwest sauce', 21, 'portion', [100, 0, 1, 10, 1.5, 1, 0, 0.4], 'sauce'],
    ['Cookie (double choc chip)', 45, 'cookie', [210, 2.5, 28, 10, 5, 17, 1, 0.3], 'dessert'],
    ['Cookie (white choc macadamia)', 45, 'cookie', [220, 2.5, 27, 11, 5, 16, 0.5, 0.3], 'dessert'],
  ]);
  add("Domino's", 'dominos pizza takeaway', '', [
    ['Pepperoni Passion pizza (medium, 1 slice)', 90, 'slice', [250, 12, 25, 11, 5, 2, 1.2, 1.3], ''],
    ['Margherita pizza (medium, 1 slice)', 80, 'slice', [190, 9, 25, 6, 3.5, 2, 1.2, 0.9], ''],
    ['Mighty Meaty (medium, 1 slice)', 100, 'slice', [250, 13, 25, 10, 4.5, 2, 1.2, 1.5], ''],
    ['Vegi Supreme (medium, 1 slice)', 95, 'slice', [190, 8, 26, 6, 3, 3, 1.5, 0.9], 'vegetarian'],
    ['Hawaiian (medium, 1 slice)', 90, 'slice', [200, 10, 26, 6, 3.5, 3.5, 1.2, 1.1], 'ham pineapple'],
    ['BBQ Chicken (medium, 1 slice)', 95, 'slice', [220, 12, 28, 6, 3, 5, 1.2, 1.1], ''],
    ['Large pizza, pepperoni (1 slice)', 110, 'slice', [300, 13, 30, 14, 6, 2.5, 1.5, 1.6], ''],
    ['Garlic & herb dip', 28, 'dip', [180, 0.3, 1, 19, 2, 1, 0, 0.4], 'sauce'],
    ['Garlic pizza bread', 300, 'portion', [870, 22, 100, 40, 15, 5, 5, 3.5], ''],
    ['Chicken wings (7)', 210, 'portion', [470, 40, 3, 33, 9, 1, 0.5, 2.6], ''],
    ['Chicken strippers (7)', 200, 'portion', [440, 35, 32, 18, 2, 1, 2, 2.4], ''],
    ['Potato wedges', 175, 'portion', [320, 5, 45, 13, 1.5, 1, 5, 1.2], ''],
    ['Cookies (4)', 100, 'portion', [470, 5, 60, 23, 12, 33, 2, 0.6], 'dessert'],
    ['Chocolate lava cake', 90, 'cake', [350, 4, 45, 17, 9, 30, 2, 0.4], 'dessert'],
  ]);
  add('Pizza Hut', 'pizza hut pizzahut', '', [
    ['Pepperoni pan pizza (medium, 1 slice)', 105, 'slice', [280, 12, 28, 13, 5, 2, 1.5, 1.4], ''],
    ['Margherita pan pizza (medium, 1 slice)', 95, 'slice', [240, 10, 28, 10, 4, 2, 1.5, 1.1], ''],
    ['Meat Feast (medium, 1 slice)', 115, 'slice', [300, 14, 28, 14, 5.5, 2, 1.5, 1.7], ''],
    ['Supreme (medium, 1 slice)', 115, 'slice', [270, 12, 28, 12, 4.5, 2.5, 1.8, 1.4], ''],
    ['Stuffed crust pepperoni (large, 1 slice)', 135, 'slice', [370, 17, 36, 17, 7.5, 3, 2, 2], ''],
    ['Garlic bread (4 pieces)', 120, 'portion', [420, 9, 50, 20, 8, 3, 2.5, 1.5], ''],
    ['Wings (6, BBQ)', 190, 'portion', [430, 33, 14, 27, 7, 11, 0.5, 2.6], ''],
    ['Fries', 130, 'portion', [340, 4, 44, 16, 1.5, 0.5, 4, 0.9], ''],
    ['Cookie dough dessert', 140, 'portion', [560, 6, 70, 28, 15, 42, 2, 0.6], 'dessert'],
  ]);
  add('Five Guys', 'five guys 5 guys burger fries', '', [
    ['Little Hamburger', 160, 'burger', [480, 23, 39, 26, 11.5, 8, 2, 1], ''],
    ['Little Cheeseburger', 180, 'burger', [550, 27, 40, 32, 15, 8, 2, 1.6], ''],
    ['Bacon Cheeseburger', 320, 'burger', [1000, 51, 40, 63, 29, 8, 2, 3.6], ''],
    ['Little Bacon Cheeseburger', 200, 'burger', [630, 31, 40, 38, 18, 8, 2, 2.3], ''],
    ['Veggie sandwich', 210, 'sandwich', [300, 9, 52, 8, 3, 11, 3, 1.3], 'vegetarian'],
    ['Grilled cheese', 170, 'sandwich', [470, 17, 41, 26, 12, 8, 2, 1.8], ''],
    ['Hot dog', 165, 'hot dog', [540, 18, 40, 35, 16, 8, 2, 2.6], ''],
    ['Little fries', 230, 'portion', [530, 8, 72, 23, 4, 2, 7, 0.1], 'chips'],
    ['Regular fries', 410, 'portion', [950, 15, 128, 41, 7, 3, 12, 0.2], 'chips'],
    ['Large fries', 560, 'portion', [1300, 20, 175, 56, 10, 4, 17, 0.3], 'chips'],
    ['Cajun fries (regular)', 410, 'portion', [950, 15, 128, 41, 7, 3, 12, 2.2], 'chips'],
    ['Milkshake (vanilla)', 450, 'shake', [670, 12, 75, 36, 24, 75, 0, 0.8], 'dessert', 1],
    ['Milkshake with Oreo & caramel', 500, 'shake', [880, 13, 115, 42, 26, 100, 1, 1.1], 'dessert', 1],
  ]);
  add('Greggs', 'greggs bakery sausage roll', '', [
    ['Vegan sausage roll', 93, 'roll', [310, 12, 26, 17, 7.5, 1, 3.5, 1.4], 'vegan'],
    ['Steak bake', 160, 'bake', [400, 15, 32, 23, 12, 1.5, 2, 1.5], ''],
    ['Chicken bake', 155, 'bake', [430, 14, 33, 26, 13, 1.5, 2, 1.3], ''],
    ['Sausage, bean & cheese melt', 155, 'melt', [440, 13, 34, 27, 14, 3, 2, 2], ''],
    ['Cheese & onion bake', 145, 'bake', [450, 12, 31, 30, 16, 2, 1.5, 1.4], 'vegetarian'],
    ['Mexican chicken bake', 155, 'bake', [420, 14, 32, 25, 12, 2, 2, 1.5], ''],
    ['Sausage breakfast roll', 145, 'roll', [380, 16, 36, 18, 6, 3, 2, 2], 'breakfast'],
    ['Bacon breakfast roll', 120, 'roll', [300, 18, 34, 9, 3.5, 3, 2, 2.2], 'breakfast'],
    ['Pizza slice (pepperoni)', 160, 'slice', [430, 17, 46, 19, 9, 4, 2.5, 2], ''],
    ['Chicken mayo baguette', 230, 'baguette', [520, 25, 62, 18, 2, 4, 3, 2], 'sandwich'],
    ['Ham & cheese baguette', 220, 'baguette', [500, 25, 60, 17, 8, 4, 3, 2.6], 'sandwich'],
    ['Tuna crunch baguette', 240, 'baguette', [520, 21, 62, 20, 2, 5, 4, 2], 'sandwich'],
    ['Southern fried chicken wrap', 210, 'wrap', [480, 20, 50, 22, 4, 4, 3, 2.2], ''],
    ['Chicken goujons (4)', 150, 'portion', [360, 25, 23, 18, 2, 0.5, 2, 1.4], ''],
    ['Potato wedges', 150, 'portion', [270, 4, 35, 12, 1, 0.5, 4, 1], ''],
    ['Glazed ring doughnut', 60, 'doughnut', [230, 3.5, 30, 11, 5, 13, 1, 0.3], 'donut'],
    ['Pink jammie doughnut', 85, 'doughnut', [300, 4, 40, 13, 6, 18, 1.5, 0.4], 'donut'],
    ['Yum yum', 70, 'yum yum', [300, 3.5, 32, 18, 8.5, 14, 1, 0.3], 'pastry'],
    ['Belgian bun', 120, 'bun', [420, 6, 70, 13, 5, 40, 2, 0.4], ''],
    ['Caramel custard doughnut', 95, 'doughnut', [320, 4, 39, 16, 8, 18, 1, 0.4], ''],
    ['Iced latte (regular)', 350, 'cup', [140, 7, 12, 7, 4.5, 12, 0, 0.2], 'coffee', 1],
    ['Latte (regular)', 340, 'cup', [140, 8, 13, 6, 3.8, 13, 0, 0.3], 'coffee', 1],
    ['Porridge (with semi-skimmed)', 300, 'pot', [250, 10, 37, 6, 2, 13, 4, 0.2], 'breakfast oats'],
  ]);
  add('Pret', 'pret a manger cafe sandwich', '', [
    ['Classic super club sandwich', 230, 'sandwich', [560, 33, 40, 29, 7, 4, 4, 2.6], ''],
    ['Tuna & cucumber baguette', 230, 'baguette', [480, 26, 55, 17, 2, 3, 3, 2], ''],
    ['Egg mayo & cress sandwich', 180, 'sandwich', [370, 15, 32, 20, 3.5, 3, 4, 1.3], ''],
    ['Falafel & halloumi wrap', 250, 'wrap', [560, 20, 55, 28, 10, 6, 7, 2.8], 'vegetarian'],
    ['Hoisin duck wrap', 210, 'wrap', [420, 19, 55, 13, 2.5, 13, 4, 2.2], ''],
    ['Chicken Caesar & bacon baguette', 250, 'baguette', [600, 33, 55, 27, 6, 3, 3, 2.7], ''],
    ['Ham & cheese croissant', 130, 'croissant', [420, 16, 28, 27, 16, 4, 1.5, 1.5], 'breakfast'],
    ['Almond croissant', 110, 'croissant', [470, 9, 40, 30, 13, 18, 3, 0.4], ''],
    ['Pain au chocolat', 75, 'pastry', [310, 6, 32, 18, 11, 10, 2, 0.4], ''],
    ['Bircher muesli bowl', 220, 'bowl', [300, 9, 42, 10, 3, 18, 5, 0.1], 'breakfast'],
    ['Porridge (classic)', 300, 'pot', [270, 11, 35, 10, 5, 13, 5, 0.3], 'breakfast oats'],
    ['Chocolate brownie', 75, 'brownie', [330, 4, 36, 19, 10, 28, 2, 0.1], 'dessert'],
    ['Chocolate chunk cookie', 85, 'cookie', [400, 5, 50, 20, 11, 30, 2, 0.5], 'dessert'],
    ['Flat white (oat)', 230, 'cup', [110, 1.5, 12, 6, 0.6, 6, 1, 0.2], 'coffee', 1],
    ['Latte (semi-skimmed, regular)', 340, 'cup', [130, 9, 13, 5, 3, 13, 0, 0.3], 'coffee', 1],
    ['Hot chocolate', 340, 'cup', [250, 10, 30, 10, 6, 28, 1, 0.3], '', 1],
    ['Fruit pot (mango, pineapple)', 150, 'pot', [80, 1, 18, 0.3, 0, 16, 2, 0], 'fruit'],
    ['Soup (tomato & basil)', 400, 'pot', [180, 4, 22, 8, 1.5, 15, 4, 2], ''],
  ]);
  add('Starbucks', 'starbucks coffee cafe', '', [
    ['Caffè latte (grande, semi-skimmed)', 473, 'grande', [190, 13, 19, 7, 4.5, 18, 0, 0.4], 'coffee', 1],
    ['Caffè latte (tall, oat)', 354, 'tall', [130, 1.5, 16, 6, 0.5, 8, 1.5, 0.3], 'coffee', 1],
    ['Cappuccino (grande)', 473, 'grande', [140, 9, 13, 5, 3, 12, 0, 0.3], 'coffee', 1],
    ['Flat white (short)', 236, 'cup', [110, 6, 9, 6, 3.5, 9, 0, 0.2], 'coffee', 1],
    ['Caramel macchiato (grande)', 473, 'grande', [250, 10, 34, 7, 4.5, 33, 0, 0.4], 'coffee', 1],
    ['Caffè mocha (grande, whipped cream)', 473, 'grande', [370, 13, 43, 15, 9, 35, 3, 0.4], 'coffee', 1],
    ['White chocolate mocha (grande)', 473, 'grande', [430, 14, 54, 17, 11, 53, 0, 0.6], 'coffee', 1],
    ['Pumpkin spice latte (grande)', 473, 'grande', [390, 14, 52, 14, 8, 50, 0, 0.6], 'coffee psl', 1],
    ['Caramel Frappuccino (grande)', 473, 'grande', [380, 5, 55, 16, 10, 54, 0, 0.6], 'coffee frappe', 1],
    ['Java chip Frappuccino (grande)', 473, 'grande', [440, 6, 63, 19, 12, 59, 2, 0.6], 'coffee frappe', 1],
    ['Iced caramel macchiato (grande)', 473, 'grande', [250, 10, 35, 7, 4.5, 33, 0, 0.4], 'coffee', 1],
    ['Cold brew (grande, black)', 473, 'grande', [5, 0, 0, 0, 0, 0, 0, 0], 'coffee', 1],
    ['Americano (grande)', 473, 'grande', [15, 1, 2, 0, 0, 0, 0, 0], 'coffee', 1],
    ['Chai tea latte (grande)', 473, 'grande', [240, 8, 45, 4.5, 2, 42, 0, 0.3], 'tea', 1],
    ['Matcha latte (grande)', 473, 'grande', [240, 12, 34, 7, 4.5, 32, 1, 0.4], 'tea', 1],
    ['Strawberry Açaí Refresher (grande)', 473, 'grande', [100, 0, 24, 0, 0, 20, 1, 0], 'drink', 1],
    ['Hot chocolate (grande)', 473, 'grande', [370, 14, 43, 16, 10, 37, 4, 0.4], '', 1],
    ['Butter croissant', 70, 'croissant', [290, 6, 32, 15, 9, 6, 1.5, 0.7], ''],
    ['Chocolate croissant', 85, 'croissant', [330, 6, 37, 17, 10, 13, 2, 0.6], ''],
    ['Blueberry muffin', 120, 'muffin', [380, 5, 52, 16, 2, 30, 1, 0.8], ''],
    ['Banana bread', 115, 'slice', [420, 6, 58, 19, 3, 30, 2, 0.8], ''],
    ['Bacon, gouda & egg sandwich', 125, 'sandwich', [360, 19, 34, 18, 7, 2, 1, 2], 'breakfast'],
    ['Egg bites (bacon & gruyère, 2)', 130, 'portion', [300, 19, 9, 20, 12, 2, 0, 1.7], 'sous vide breakfast'],
    ['Cake pop (birthday)', 40, 'cake pop', [160, 1.5, 22, 8, 4, 18, 0, 0.2], ''],
    ['Cheese & Marmite panini', 170, 'panini', [450, 20, 45, 21, 12, 3, 3, 2.2], ''],
    ['Chicken & pesto panini', 200, 'panini', [460, 28, 45, 18, 6, 3, 3, 2], ''],
  ]);
  add('Costa', 'costa coffee cafe', '', [
    ['Flat white (semi-skimmed)', 300, 'cup', [95, 6.5, 9, 3.5, 2.3, 9, 0, 0.2], 'coffee', 1],
    ['Latte (medium, semi-skimmed)', 400, 'medium', [150, 10, 15, 5.5, 3.5, 15, 0, 0.3], 'coffee', 1],
    ['Cappuccino (medium)', 400, 'medium', [120, 8, 12, 4.5, 3, 12, 0, 0.3], 'coffee', 1],
    ['Cortado', 200, 'cup', [70, 4.5, 6.5, 2.5, 1.7, 6.5, 0, 0.1], 'coffee', 1],
    ['Frostino (caramel, medium)', 400, 'medium', [330, 5, 55, 10, 7, 52, 0, 0.4], 'coffee frappe', 1],
    ['Hot chocolate (medium)', 400, 'medium', [270, 10, 38, 8, 5, 35, 2, 0.4], '', 1],
    ['Ham & cheese toastie', 150, 'toastie', [380, 22, 38, 15, 8, 3, 2, 2.2], ''],
    ['Cheese & tomato toastie', 160, 'toastie', [400, 19, 42, 17, 10, 4, 2.5, 1.9], 'vegetarian'],
    ['Bacon roll', 120, 'roll', [320, 17, 36, 11, 4, 3, 2, 2.4], 'breakfast'],
    ['Croissant (all-butter)', 65, 'croissant', [270, 5.5, 29, 15, 9, 5, 1.5, 0.6], ''],
    ['Blueberry muffin', 125, 'muffin', [440, 5.5, 55, 22, 3, 30, 1.5, 0.8], ''],
    ['Millionaire’s shortbread', 75, 'slice', [370, 3.5, 44, 20, 12, 30, 1, 0.3], ''],
    ['Lemon drizzle cake', 95, 'slice', [380, 4, 50, 18, 6, 35, 1, 0.4], ''],
  ]);
  add('Taco Bell', 'taco bell mexican', '', [
    ['Crunchy taco', 78, 'taco', [170, 8, 13, 10, 3.5, 1, 3, 0.8], ''],
    ['Soft taco (beef)', 99, 'taco', [180, 9, 18, 9, 3.5, 1, 3, 1.3], ''],
    ['Doritos Locos taco', 78, 'taco', [170, 8, 13, 10, 3.5, 1, 3, 0.9], ''],
    ['Crunchwrap Supreme', 254, 'crunchwrap', [530, 16, 71, 21, 6, 6, 6, 3], ''],
    ['Chalupa Supreme (beef)', 153, 'chalupa', [350, 13, 30, 20, 4.5, 3, 3, 1.5], ''],
    ['Cheesy Gordita Crunch', 153, 'gordita', [500, 20, 41, 28, 10, 3, 5, 2.2], ''],
    ['Bean burrito', 198, 'burrito', [350, 13, 54, 9, 3.5, 3, 9, 2.6], 'vegetarian'],
    ['Burrito Supreme (beef)', 248, 'burrito', [390, 16, 50, 14, 6, 4, 7, 2.8], ''],
    ['Cheesy bean & rice burrito', 191, 'burrito', [420, 9, 55, 17, 4.5, 3, 5, 2.2], ''],
    ['Quesadilla (chicken)', 184, 'quesadilla', [520, 27, 37, 28, 13, 3, 2, 3], ''],
    ['Mexican pizza', 213, 'pizza', [540, 20, 46, 31, 11, 3, 7, 2.5], ''],
    ['Nachos BellGrande', 308, 'portion', [740, 16, 82, 38, 7, 5, 12, 2.7], ''],
    ['Chips & nacho cheese', 99, 'portion', [220, 3, 26, 12, 1.5, 1, 2, 0.8], ''],
    ['Cinnamon twists', 35, 'portion', [170, 1, 26, 7, 0, 10, 1, 0.4], 'dessert'],
    ['Seasoned fries (regular)', 120, 'portion', [320, 4, 40, 16, 2, 0.3, 4, 1.4], 'nacho fries'],
    ['Baja Blast (medium)', 600, 'drink', [220, 0, 59, 0, 0, 59, 0, 0.1], 'mountain dew', 1],
  ]);
  add('Popeyes', 'popeyes fried chicken louisiana', '', [
    ['Spicy chicken leg', 70, 'piece', [160, 14, 5, 9, 3.5, 0, 0, 1.1], ''],
    ['Chicken thigh (classic)', 130, 'piece', [380, 22, 13, 27, 9, 0, 0.5, 2.2], ''],
    ['Chicken breast (classic)', 170, 'piece', [380, 35, 16, 20, 8, 0, 0.5, 3.1], ''],
    ['Handcrafted tenders (3)', 160, 'portion', [445, 37, 26, 21, 9, 0, 1, 3.6], 'strips'],
    ['Cajun fries (regular)', 113, 'portion', [270, 4, 36, 12, 5, 0, 3, 1.4], ''],
    ['Red beans & rice (regular)', 140, 'pot', [250, 8, 25, 13, 5, 0, 5, 1.5], ''],
    ['Mashed potatoes & Cajun gravy', 140, 'pot', [110, 2, 18, 4, 1, 0, 1, 1.4], ''],
    ['Coleslaw (regular)', 125, 'pot', [190, 1, 15, 14, 2, 12, 2, 0.6], ''],
    ['Biscuit', 64, 'biscuit', [210, 3, 23, 11, 5, 2, 0.5, 1.2], ''],
    ['Chicken wrap', 160, 'wrap', [380, 18, 34, 19, 5, 2, 2, 2.2], ''],
  ]);
  add('Wingstop', 'wingstop wings', '', [
    ['Lemon pepper wings (6)', 200, 'portion', [580, 48, 0, 42, 10, 0, 0, 2.4], ''],
    ['Garlic parmesan wings (6)', 200, 'portion', [640, 48, 1, 48, 12, 0, 0, 2.8], ''],
    ['Mango habanero wings (6)', 220, 'portion', [540, 48, 18, 30, 8, 16, 0, 2.6], ''],
    ['Boneless wings (6, original hot)', 180, 'portion', [500, 30, 33, 27, 5, 1, 2, 4], ''],
    ['Crispy tenders (4)', 220, 'portion', [580, 44, 32, 30, 5, 1, 2, 3.5], ''],
    ['Seasoned fries (regular)', 200, 'portion', [500, 6, 60, 26, 4, 0.5, 6, 2.4], ''],
    ['Cajun corn', 140, 'portion', [190, 4, 26, 9, 4, 6, 3, 0.8], ''],
    ['Ranch dip', 70, 'dip', [310, 1, 3, 32, 5, 2, 0, 1.4], 'sauce'],
    ['Blue cheese dip', 70, 'dip', [330, 2, 2, 35, 6, 1, 0, 1.6], 'sauce'],
  ]);
  add("Wendy's", 'wendys burger', '', [
    ['Dave’s Single', 270, 'burger', [590, 29, 39, 34, 14, 9, 2, 3.3], ''],
    ['Dave’s Double', 360, 'burger', [860, 49, 39, 55, 23, 9, 2, 4.2], ''],
    ['Baconator', 300, 'burger', [960, 57, 38, 66, 27, 8, 1, 4.7], ''],
    ['Spicy chicken sandwich', 240, 'burger', [500, 28, 49, 21, 4, 5, 3, 3.1], ''],
    ['Classic chicken sandwich', 240, 'burger', [490, 29, 48, 20, 3.5, 5, 2, 2.8], ''],
    ['Junior bacon cheeseburger', 160, 'burger', [370, 19, 26, 21, 8, 6, 1, 2], ''],
    ['Chicken nuggets (10)', 150, 'portion', [470, 23, 30, 30, 6, 0, 1, 2.5], ''],
    ['Fries (medium)', 140, 'portion', [350, 5, 47, 16, 3, 0, 4, 0.8], ''],
    ['Baked potato with sour cream & chives', 300, 'potato', [310, 8, 63, 3, 2, 3, 7, 0.2], ''],
    ['Chili (small)', 227, 'cup', [250, 17, 23, 9, 3.5, 6, 6, 2.3], ''],
    ['Frosty, chocolate (medium)', 400, 'frosty', [460, 12, 77, 12, 8, 64, 0, 0.6], 'dessert', 1],
  ]);
  add('Krispy Kreme', 'krispy kreme doughnut donut', '', [
    ['Chocolate iced glazed', 63, 'doughnut', [240, 3, 33, 11, 5, 21, 0.5, 0.3], ''],
    ['Chocolate iced custard filled', 85, 'doughnut', [290, 4, 36, 15, 7, 19, 1, 0.4], ''],
    ['Lotus Biscoff doughnut', 85, 'doughnut', [340, 4, 40, 18, 9, 22, 1, 0.4], ''],
    ['Strawberry filled', 80, 'doughnut', [280, 3.5, 36, 13, 6, 17, 0.5, 0.3], 'jam'],
    ['Glazed raspberry', 80, 'doughnut', [290, 3, 40, 13, 6, 22, 0.5, 0.3], ''],
  ]);
  add('Dunkin', 'dunkin donuts doughnut', '', [
    ['Boston Kreme donut', 79, 'doughnut', [300, 4, 39, 14, 6, 17, 1, 0.6], ''],
    ['Chocolate frosted donut', 71, 'doughnut', [280, 3, 33, 15, 7, 14, 1, 0.8], ''],
    ['Jelly donut', 79, 'doughnut', [270, 4, 37, 12, 5, 15, 1, 0.8], ''],
    ['Munchkins (5, glazed)', 70, 'portion', [270, 3, 35, 13, 6, 17, 1, 0.8], 'donut holes'],
    ['Bacon, egg & cheese croissant', 160, 'sandwich', [540, 20, 37, 35, 14, 5, 1, 2.8], 'breakfast'],
    ['Sausage, egg & cheese wake-up wrap', 100, 'wrap', [300, 11, 15, 22, 8, 1, 0, 1.6], 'breakfast'],
    ['Hash browns (6)', 85, 'portion', [130, 1, 15, 7, 1, 0, 2, 0.6], ''],
    ['Iced coffee with cream & sugar (medium)', 680, 'medium', [210, 2, 32, 8, 5, 30, 0, 0.2], 'coffee', 1],
    ['Caramel iced latte (medium)', 680, 'medium', [300, 11, 42, 9, 6, 41, 0, 0.5], 'coffee', 1],
    ['Hot coffee, black (medium)', 414, 'medium', [5, 0, 0, 0, 0, 0, 0, 0], 'coffee', 1],
    ['Coolatta (vanilla bean, medium)', 680, 'medium', [600, 4, 110, 15, 11, 100, 0, 0.5], 'frozen drink', 1],
  ]);
  add('Tim Hortons', 'tim hortons timmies', '', [
    ['Double-double coffee (medium)', 410, 'medium', [230, 3, 26, 13, 8, 26, 0, 0.1], 'coffee double double', 1],
    ['Iced Capp (medium)', 470, 'medium', [360, 4, 47, 18, 12, 46, 0, 0.2], 'coffee frozen', 1],
    ['Timbits (10, assorted)', 150, 'portion', [580, 6, 80, 26, 12, 40, 2, 1.2], 'donut holes'],
    ['Honey dip donut', 60, 'doughnut', [210, 3, 32, 8, 4, 13, 1, 0.6], ''],
    ['Boston cream donut', 85, 'doughnut', [250, 4, 39, 9, 4.5, 18, 1, 0.6], ''],
    ['Everything bagel with cream cheese', 140, 'bagel', [430, 13, 58, 16, 9, 6, 3, 1.6], 'breakfast'],
    ['Bacon breakfast sandwich (English muffin)', 140, 'sandwich', [370, 19, 27, 21, 8, 2, 1, 2.1], 'breakfast'],
    ['Farmer’s wrap / breakfast wrap', 210, 'wrap', [550, 21, 39, 34, 11, 2, 2, 2.4], 'breakfast'],
    ['Chili (bowl)', 300, 'bowl', [290, 18, 29, 11, 4.5, 8, 7, 3], ''],
    ['Chicken bacon ranch wrap', 210, 'wrap', [510, 30, 41, 24, 7, 2, 2, 2.9], ''],
  ]);

  // ------------------------------------------------------------------ USA & Canada
  add('Chick-fil-A', 'chick fil a chickfila chicken sandwich', 'us', [
    ['Chicken Sandwich', 183, 'sandwich', [420, 29, 41, 18, 3.5, 6, 1, 3.4], ''],
    ['Spicy Chicken Sandwich', 183, 'sandwich', [450, 28, 45, 19, 3.5, 6, 2, 4], ''],
    ['Deluxe Chicken Sandwich', 230, 'sandwich', [500, 32, 43, 22, 6, 7, 2, 3.7], ''],
    ['Grilled Chicken Sandwich', 230, 'sandwich', [390, 28, 44, 12, 2, 13, 4, 1.9], ''],
    ['Chick-fil-A Nuggets (8)', 113, 'portion', [250, 27, 11, 11, 2.5, 1, 0, 1.9], ''],
    ['Chick-fil-A Nuggets (12)', 170, 'portion', [380, 40, 16, 17, 3.5, 1.5, 0, 2.8], ''],
    ['Grilled Nuggets (8)', 113, 'portion', [130, 25, 1, 3, 0.5, 1, 0, 1.1], 'healthy'],
    ['Chick-n-Strips (3)', 135, 'portion', [310, 29, 16, 14, 3, 1, 0, 2.3], 'tenders'],
    ['Waffle Potato Fries (medium)', 125, 'portion', [420, 5, 45, 24, 4, 1, 5, 0.6], 'fries'],
    ['Mac & Cheese (medium)', 225, 'portion', [450, 20, 29, 29, 16, 3, 1, 2.7], ''],
    ['Chicken biscuit', 160, 'biscuit', [460, 19, 45, 23, 8, 6, 2, 3.4], 'breakfast'],
    ['Chick-n-Minis (4)', 140, 'portion', [360, 19, 41, 13, 3.5, 8, 2, 2.8], 'breakfast'],
    ['Cobb salad with nuggets', 400, 'salad', [830, 42, 30, 59, 12, 7, 5, 4], ''],
    ['Chick-fil-A sauce', 28, 'pot', [140, 0, 6, 13, 2, 6, 0, 0.5], ''],
    ['Polynesian sauce', 28, 'pot', [110, 0, 13, 6, 1, 12, 0, 0.5], ''],
    ['Cookies & cream milkshake (small)', 400, 'shake', [630, 13, 90, 24, 15, 82, 1, 0.9], 'dessert', 1],
    ['Lemonade (medium)', 591, 'drink', [220, 0, 58, 0, 0, 55, 0, 0], '', 1],
    ['Sweet tea (medium)', 591, 'drink', [120, 0, 31, 0, 0, 31, 0, 0], '', 1],
  ]);
  add('Chipotle', 'chipotle mexican grill burrito bowl', 'us', [
    ['Burrito, chicken (rice, beans, salsa, cheese, lettuce)', 560, 'burrito', [1060, 61, 117, 36, 15, 6, 15, 5.4], ''],
    ['Burrito bowl, chicken (rice, beans, salsa, cheese)', 470, 'bowl', [740, 54, 78, 23, 11, 5, 14, 4.5], ''],
    ['Burrito bowl, steak', 470, 'bowl', [710, 47, 78, 22, 11, 5, 14, 4.6], ''],
    ['Burrito bowl, barbacoa', 470, 'bowl', [720, 49, 78, 23, 11, 5, 14, 5], ''],
    ['Burrito bowl, carnitas', 470, 'bowl', [780, 46, 78, 30, 14, 5, 14, 4.7], ''],
    ['Burrito bowl, sofritas', 470, 'bowl', [680, 30, 82, 25, 9, 7, 16, 4.6], 'vegan tofu'],
    ['Salad bowl, chicken & fajita veg (no rice)', 380, 'bowl', [450, 40, 28, 20, 7, 6, 9, 3.4], 'healthy'],
    ['Chips & guacamole', 230, 'portion', [770, 10, 81, 47, 6, 2, 14, 1.3], ''],
    ['Chips', 113, 'bag', [540, 7, 73, 25, 3.5, 1, 7, 1], ''],
    ['Guacamole (side)', 113, 'pot', [230, 2, 8, 22, 3.5, 1, 6, 0.9], ''],
    ['Queso blanco (side)', 113, 'pot', [240, 11, 6, 19, 11, 2, 0, 1.6], ''],
    ['3 tacos, chicken (soft)', 330, 'portion', [570, 41, 48, 22, 10, 4, 7, 3.3], ''],
    ['Quesadilla, chicken', 300, 'quesadilla', [1000, 64, 60, 56, 27, 3, 5, 5], ''],
    ['Kids’ build your own (chicken)', 220, 'meal', [350, 20, 40, 11, 5, 2, 6, 1.6], ''],
  ]);
  add('In-N-Out', 'in n out innout burger', 'us', [
    ['Double-Double', 330, 'burger', [610, 34, 41, 34, 17, 10, 3, 3.6], ''],
    ['Cheeseburger', 268, 'burger', [430, 20, 39, 21, 9, 10, 3, 2.7], ''],
    ['Hamburger', 243, 'burger', [360, 16, 37, 16, 5, 8, 3, 1.6], ''],
    ['Double-Double protein style (lettuce wrap)', 300, 'burger', [330, 18, 11, 25, 12, 7, 3, 2.8], 'low carb'],
    ['Double-Double Animal Style', 360, 'burger', [710, 36, 43, 44, 19, 12, 3, 4], ''],
    ['French fries', 125, 'portion', [360, 6, 49, 15, 1.5, 0, 6, 0.4], ''],
    ['Animal fries', 300, 'portion', [750, 19, 54, 49, 17, 7, 4, 2.9], ''],
    ['Chocolate shake', 425, 'shake', [590, 16, 78, 29, 19, 63, 0, 1], 'dessert', 1],
  ]);
  add('Shake Shack', 'shake shack burger', 'all', [
    ['ShackBurger', 210, 'burger', [500, 29, 26, 30, 13, 6, 0, 3.1], ''],
    ['Double ShackBurger', 300, 'burger', [760, 51, 27, 48, 22, 7, 0, 4.3], ''],
    ['SmokeShack', 220, 'burger', [570, 33, 27, 36, 15, 7, 1, 3.8], ''],
    ['Chicken Shack', 230, 'burger', [550, 33, 34, 32, 6, 5, 2, 3.2], ''],
    ['Shack-cago dog', 200, 'hot dog', [470, 18, 37, 28, 10, 8, 2, 4.2], ''],
    ['Fries', 120, 'portion', [470, 6, 63, 22, 4, 0, 6, 0.9], 'crinkle'],
    ['Cheese fries', 185, 'portion', [710, 15, 66, 43, 16, 2, 6, 2.6], ''],
    ['Vanilla shake', 450, 'shake', [680, 17, 75, 36, 22, 72, 0, 1.2], 'dessert', 1],
  ]);
  add("Arby's", 'arbys roast beef', 'us', [
    ['Classic roast beef', 157, 'sandwich', [360, 23, 37, 14, 5, 5, 2, 2.4], ''],
    ['Beef ’n Cheddar', 195, 'sandwich', [450, 23, 45, 20, 6, 9, 2, 3.2], ''],
    ['Smokehouse brisket', 290, 'sandwich', [600, 35, 46, 31, 11, 13, 2, 4.4], ''],
    ['Crispy chicken sandwich', 210, 'sandwich', [520, 23, 54, 24, 4, 7, 3, 3.3], ''],
    ['Curly fries (medium)', 128, 'portion', [430, 5, 54, 22, 3, 0, 5, 2.4], ''],
    ['Jamocha shake (medium)', 450, 'shake', [610, 13, 98, 18, 11, 87, 0, 0.9], 'dessert', 1],
  ]);
  add('Jack in the Box', 'jack in the box', 'us', [
    ['Jumbo Jack with cheese', 260, 'burger', [600, 26, 48, 34, 12, 9, 2, 2.8], ''],
    ['Sourdough Jack', 250, 'burger', [710, 33, 37, 49, 17, 4, 2, 3.4], ''],
    ['Tacos (2)', 180, 'portion', [340, 12, 32, 18, 5, 2, 4, 1.4], ''],
    ['Curly fries (medium)', 125, 'portion', [430, 6, 52, 22, 4, 0, 5, 2.5], ''],
    ['Egg rolls (3)', 180, 'portion', [430, 13, 46, 21, 5, 4, 5, 2.8], ''],
  ]);
  add('Sonic', 'sonic drive-in', 'us', [
    ['SuperSONIC double cheeseburger', 320, 'burger', [990, 49, 49, 66, 25, 11, 2, 4.2], ''],
    ['Sonic cheeseburger', 240, 'burger', [690, 31, 48, 41, 15, 10, 2, 3.1], ''],
    ['Footlong quarter pound coney', 250, 'hot dog', [760, 27, 49, 50, 19, 7, 3, 5], ''],
    ['Tots (medium)', 130, 'portion', [370, 4, 39, 22, 4, 0, 4, 1.7], 'tater tots'],
    ['Cherry limeade (medium)', 600, 'drink', [240, 0, 66, 0, 0, 64, 0, 0.1], '', 1],
  ]);
  add('Dairy Queen', 'dairy queen dq blizzard', 'us', [
    ['Oreo Blizzard (medium)', 400, 'cup', [770, 16, 110, 28, 14, 88, 1, 1.4], 'dessert'],
    ['Reese’s Blizzard (medium)', 400, 'cup', [800, 18, 105, 32, 15, 90, 2, 1.2], 'dessert'],
    ['Dipped cone (medium)', 200, 'cone', [470, 8, 56, 24, 15, 43, 1, 0.5], 'dessert'],
    ['Soft serve cone (medium)', 200, 'cone', [330, 8, 50, 10, 6, 38, 0, 0.4], 'dessert'],
    ['Signature Stackburger (double)', 280, 'burger', [710, 39, 41, 43, 18, 9, 2, 3], ''],
    ['Chicken strip basket (4 strips)', 400, 'basket', [1000, 40, 100, 50, 8, 6, 7, 5], ''],
  ]);
  add('Panda Express', 'panda express chinese', 'us', [
    ['Orange chicken (1 entrée)', 162, 'portion', [490, 25, 51, 23, 5, 19, 2, 2.1], ''],
    ['Beijing beef (1 entrée)', 156, 'portion', [470, 13, 46, 26, 5, 24, 1, 2.2], ''],
    ['Broccoli beef (1 entrée)', 153, 'portion', [150, 9, 13, 7, 1.5, 7, 2, 1.3], ''],
    ['Grilled teriyaki chicken (1 entrée)', 167, 'portion', [275, 33, 8, 10, 3, 8, 0, 1.3], ''],
    ['Kung pao chicken (1 entrée)', 167, 'portion', [290, 16, 14, 19, 3.5, 6, 2, 2.4], ''],
    ['String bean chicken breast (1 entrée)', 153, 'portion', [190, 14, 13, 9, 2, 4, 4, 1.5], ''],
    ['Honey walnut shrimp (1 entrée)', 110, 'portion', [360, 13, 35, 23, 3.5, 9, 2, 1.1], ''],
    ['Chow mein (side)', 266, 'portion', [510, 13, 80, 20, 3.5, 9, 6, 2.2], 'noodles'],
    ['Fried rice (side)', 263, 'portion', [520, 11, 85, 16, 3, 3, 1, 2.1], ''],
    ['Steamed white rice (side)', 230, 'portion', [380, 7, 87, 0, 0, 0, 0, 0], ''],
    ['Super greens (side)', 160, 'portion', [90, 6, 10, 3, 0.5, 3, 5, 0.7], 'healthy'],
    ['Chicken egg roll', 85, 'egg roll', [200, 6, 20, 10, 3, 2, 2, 0.9], ''],
    ['Cream cheese rangoon (3)', 70, 'portion', [190, 5, 24, 8, 5, 1, 2, 0.5], ''],
  ]);
  add('Panera Bread', 'panera bread cafe', 'us', [
    ['Broccoli cheddar soup (bowl)', 340, 'bowl', [360, 14, 29, 21, 13, 7, 6, 3.2], ''],
    ['Broccoli cheddar soup in bread bowl', 560, 'bread bowl', [900, 37, 135, 23, 13, 8, 9, 6], ''],
    ['Chicken noodle soup (bowl)', 340, 'bowl', [150, 11, 18, 4, 1, 2, 1, 3.5], ''],
    ['Frontega chicken panini', 300, 'panini', [810, 44, 75, 37, 11, 4, 3, 5], ''],
    ['Bacon turkey bravo sandwich', 300, 'sandwich', [790, 46, 78, 33, 10, 13, 3, 6.6], ''],
    ['Fuji apple salad with chicken', 300, 'salad', [570, 34, 31, 36, 9, 22, 5, 1.8], ''],
    ['Mac & cheese (bowl)', 340, 'bowl', [960, 36, 66, 61, 30, 6, 2, 4.8], ''],
    ['Cinnamon crunch bagel', 125, 'bagel', [420, 9, 82, 6, 3.5, 33, 2, 1.1], ''],
    ['Chocolate chipper cookie', 92, 'cookie', [390, 4, 52, 20, 12, 33, 2, 0.6], 'dessert'],
  ]);
  add('Whataburger', 'whataburger texas', 'us', [
    ['Whataburger', 320, 'burger', [590, 29, 62, 25, 8, 12, 3, 2.9], ''],
    ['Double meat Whataburger', 420, 'burger', [830, 48, 63, 42, 14, 12, 3, 3.5], ''],
    ['Honey butter chicken biscuit', 180, 'biscuit', [600, 18, 56, 34, 15, 13, 2, 3], 'breakfast'],
    ['Whatachick’n strips (3)', 160, 'portion', [460, 32, 30, 24, 4, 0, 2, 2.6], ''],
    ['Fries (medium)', 140, 'portion', [400, 5, 51, 20, 3, 0, 4, 0.6], ''],
  ]);
  add("Culver's", 'culvers butterburger custard', 'us', [
    ['ButterBurger The Original (double)', 260, 'burger', [690, 40, 38, 41, 17, 7, 1, 2.3], ''],
    ['Cheese curds (regular)', 140, 'portion', [510, 21, 37, 33, 15, 2, 1, 2.8], ''],
    ['Concrete mixer (medium, Oreo)', 450, 'cup', [1000, 17, 108, 54, 32, 88, 1, 1.4], 'frozen custard dessert'],
    ['Crinkle fries (medium)', 150, 'portion', [370, 4, 46, 19, 3, 0, 4, 0.8], ''],
  ]);
  add("Carl's Jr / Hardee's", 'carls jr hardees', 'us', [
    ['Famous Star with cheese', 260, 'burger', [670, 27, 54, 39, 12, 12, 3, 3], ''],
    ['Western Bacon Cheeseburger', 260, 'burger', [730, 33, 72, 35, 14, 22, 2, 3.4], ''],
    ['Big Hardee breakfast biscuit', 230, 'biscuit', [790, 31, 40, 56, 22, 3, 1, 5.2], 'breakfast'],
    ['Natural-cut fries (medium)', 145, 'portion', [430, 6, 55, 21, 4, 0, 5, 1.6], ''],
  ]);
  add("Raising Cane's", 'raising canes chicken fingers', 'us', [
    ['Chicken finger (1)', 45, 'finger', [130, 13, 6, 6, 1.5, 0, 0, 0.7], 'tenders'],
    ['The Box Combo (4 fingers, fries, toast, slaw, sauce)', 600, 'box', [1550, 63, 130, 87, 15, 15, 7, 6.5], ''],
    ['3 Finger Combo', 470, 'meal', [1180, 46, 103, 64, 11, 10, 6, 5], ''],
    ['Cane’s sauce', 42, 'pot', [190, 0, 4, 19, 3, 3, 0, 0.9], ''],
    ['Texas toast', 45, 'slice', [150, 4, 20, 6, 1.5, 2, 1, 0.7], ''],
    ['Crinkle fries (regular)', 130, 'portion', [390, 5, 49, 19, 3.5, 0, 5, 0.1], ''],
  ]);
  add("Zaxby's", 'zaxbys chicken', 'us', [
    ['Chicken fingerz plate (5)', 600, 'plate', [1300, 55, 120, 67, 13, 7, 8, 6.5], ''],
    ['Kickin’ chicken sandwich', 250, 'sandwich', [600, 30, 50, 30, 6, 6, 3, 3.6], ''],
    ['Boneless wings (5, buffalo)', 200, 'portion', [500, 30, 25, 32, 6, 1, 1, 4.5], ''],
  ]);
  add('Bojangles', 'bojangles chicken biscuit', 'us', [
    ['Cajun filet biscuit', 160, 'biscuit', [550, 22, 45, 31, 11, 4, 1, 3.5], 'breakfast'],
    ['Chicken leg (spicy)', 85, 'piece', [240, 16, 8, 16, 5, 0, 0, 1.4], ''],
    ['Bo-Berry biscuit', 80, 'biscuit', [370, 4, 41, 21, 8, 16, 1, 1.2], ''],
    ['Cajun pintos (individual)', 140, 'pot', [110, 6, 20, 1, 0, 1, 6, 1.4], ''],
  ]);
  add("Jersey Mike's", 'jersey mikes sub', 'us', [
    ['#13 The Original Italian (regular, Mike’s way)', 330, 'sub', [890, 37, 66, 52, 17, 6, 3, 5.8], ''],
    ['Turkey & provolone (regular)', 330, 'sub', [700, 38, 64, 32, 9, 6, 3, 4.6], ''],
    ['Chipotle cheesesteak (regular)', 360, 'sub', [960, 47, 65, 57, 17, 6, 3, 4.6], ''],
  ]);
  add("Jimmy John's", 'jimmy johns sub', 'us', [
    ['Turkey Tom (8-inch)', 280, 'sub', [480, 24, 50, 21, 3, 3, 2, 3], ''],
    ['Vito (8-inch)', 280, 'sub', [640, 29, 51, 35, 12, 3, 2, 4.5], ''],
    ['Unwich (turkey, lettuce wrap)', 230, 'unwich', [260, 19, 6, 18, 3, 2, 2, 2.4], 'low carb'],
  ]);
  add("Papa John's", 'papa johns pizza', 'all', [
    ['Pepperoni pizza (large, 1 slice)', 115, 'slice', [330, 14, 37, 14, 6, 4, 2, 2], ''],
    ['Cheese pizza (large, 1 slice)', 110, 'slice', [290, 12, 37, 10, 4.5, 4, 2, 1.5], ''],
    ['The Works (large, 1 slice)', 135, 'slice', [340, 15, 38, 15, 6, 5, 2, 2], ''],
    ['Garlic dipping sauce', 28, 'pot', [150, 0, 0, 17, 3, 0, 0, 0.6], ''],
    ['Garlic knots (2)', 70, 'portion', [230, 6, 30, 9, 2, 2, 1, 1.2], ''],
    ['Chicken wings (8, BBQ)', 250, 'portion', [560, 46, 20, 32, 9, 15, 0, 4.2], ''],
  ]);
  add('Little Caesars', 'little caesars pizza', 'us', [
    ['Classic pepperoni pizza (1 slice)', 100, 'slice', [280, 13, 32, 11, 5, 3, 2, 1.4], ''],
    ['Classic cheese pizza (1 slice)', 95, 'slice', [250, 11, 32, 9, 4.5, 3, 2, 1.1], ''],
    ['Crazy Bread (1 stick)', 40, 'stick', [100, 3, 17, 2.5, 0.5, 1, 1, 0.4], ''],
  ]);
  add('Qdoba', 'qdoba mexican', 'us', [
    ['Chicken burrito (with queso)', 550, 'burrito', [1050, 56, 115, 40, 17, 6, 14, 5], ''],
    ['Chicken bowl', 450, 'bowl', [690, 45, 75, 22, 9, 5, 13, 4], ''],
  ]);
  add('Del Taco', 'del taco mexican', 'us', [
    ['The Del Taco', 120, 'taco', [250, 12, 17, 15, 7, 1, 2, 1.1], ''],
    ['Epic burrito (chicken)', 450, 'burrito', [930, 39, 95, 44, 15, 4, 8, 5], ''],
  ]);
  add('El Pollo Loco', 'el pollo loco chicken mexican', 'us', [
    ['Fire-grilled chicken breast', 160, 'piece', [210, 38, 0, 6, 2, 0, 0, 1.8], 'healthy'],
    ['Fire-grilled chicken leg', 60, 'piece', [90, 12, 0, 4.5, 1.5, 0, 0, 0.6], ''],
    ['Chicken avocado burrito', 400, 'burrito', [870, 44, 76, 43, 14, 3, 9, 4.6], ''],
  ]);
  add('Sweetgreen', 'sweetgreen salad bowl healthy', 'us', [
    ['Harvest bowl', 400, 'bowl', [700, 35, 60, 37, 6, 10, 8, 2.6], ''],
    ['Kale Caesar', 300, 'bowl', [430, 31, 22, 25, 7, 3, 4, 2.2], ''],
    ['Chicken pesto parm', 400, 'bowl', [530, 36, 40, 26, 5, 4, 8, 2.2], ''],
  ]);
  add('Cava', 'cava mediterranean bowl', 'us', [
    ['Chicken + rice bowl', 450, 'bowl', [710, 40, 60, 34, 7, 6, 9, 3.2], ''],
    ['Greek salad bowl (chicken)', 380, 'bowl', [520, 37, 20, 33, 8, 5, 6, 3.3], ''],
    ['Pita chips', 60, 'portion', [270, 5, 33, 13, 1.5, 1, 2, 1], ''],
  ]);
  add('Buffalo Wild Wings', 'bww buffalo wild wings bdubs', 'us', [
    ['Traditional wings (10, medium sauce)', 340, 'portion', [880, 81, 1, 60, 16, 0, 0, 7], ''],
    ['Boneless wings (10, honey BBQ)', 340, 'portion', [1040, 50, 86, 52, 9, 42, 3, 6.6], ''],
    ['Fries (regular)', 200, 'portion', [550, 7, 72, 26, 4, 0, 6, 2.6], ''],
  ]);
  add('IHOP', 'ihop pancakes breakfast', 'us', [
    ['Original buttermilk pancakes (short stack, 3)', 270, 'stack', [450, 12, 70, 14, 6, 15, 3, 3.3], ''],
    ['Big Steak Omelette', 430, 'omelette', [1100, 66, 20, 82, 33, 3, 2, 5.5], ''],
    ['Belgian waffle', 180, 'waffle', [590, 12, 69, 30, 17, 16, 2, 1.8], ''],
    ['Breakfast sampler', 550, 'plate', [1200, 50, 70, 80, 28, 15, 4, 6.5], ''],
  ]);
  add("Denny's", 'dennys diner breakfast', 'us', [
    ['Grand Slam (pancakes, eggs, bacon, sausage)', 450, 'plate', [890, 38, 66, 52, 17, 13, 3, 5], ''],
    ['Moons Over My Hammy', 380, 'sandwich', [780, 43, 54, 42, 18, 6, 3, 6], ''],
    ['Bacon slamburger', 400, 'burger', [1100, 63, 51, 71, 28, 10, 3, 5.7], ''],
  ]);
  add('Waffle House', 'waffle house diner', 'us', [
    ['Classic waffle', 140, 'waffle', [410, 8, 55, 18, 7, 15, 1, 1.4], ''],
    ['Hashbrowns scattered, smothered & covered', 250, 'portion', [430, 9, 34, 29, 9, 4, 3, 2], ''],
    ['All-Star Special', 500, 'plate', [1050, 40, 80, 63, 20, 18, 4, 5], ''],
  ]);
  add('Olive Garden', 'olive garden italian restaurant', 'us', [
    ['Fettuccine Alfredo', 500, 'plate', [1310, 30, 96, 89, 54, 5, 5, 4.4], ''],
    ['Chicken parmigiana', 550, 'plate', [1060, 82, 87, 42, 15, 11, 7, 7.5], ''],
    ['Tour of Italy', 700, 'plate', [1520, 72, 98, 93, 42, 14, 7, 8.5], ''],
    ['Breadstick (1)', 50, 'breadstick', [140, 4, 25, 2.5, 0.5, 1, 1, 0.8], ''],
    ['House salad with dressing', 150, 'salad', [150, 3, 17, 8, 1.5, 4, 3, 1.6], ''],
    ['Zuppa Toscana (bowl)', 340, 'bowl', [220, 8, 15, 15, 7, 2, 2, 2.2], 'soup'],
  ]);
  add("Applebee's", 'applebees restaurant', 'us', [
    ['Classic bacon cheeseburger with fries', 600, 'plate', [1460, 60, 104, 89, 30, 14, 8, 6.4], ''],
    ['Boneless wings (classic buffalo)', 300, 'portion', [940, 46, 52, 61, 12, 2, 3, 8], ''],
    ['Chicken tenders platter', 500, 'plate', [1300, 62, 104, 72, 13, 10, 8, 5.8], ''],
  ]);
  add("Chili's", 'chilis restaurant tex mex', 'us', [
    ['Oldtimer with cheese burger + fries', 600, 'plate', [1340, 60, 106, 76, 27, 13, 9, 6.5], ''],
    ['Chicken crispers (with fries)', 550, 'plate', [1500, 60, 110, 93, 15, 10, 8, 7], ''],
    ['Chicken fajitas (with tortillas)', 600, 'plate', [860, 60, 70, 36, 11, 12, 8, 9], ''],
  ]);
  add('The Cheesecake Factory', 'cheesecake factory restaurant', 'us', [
    ['Original cheesecake (slice)', 180, 'slice', [830, 12, 69, 57, 35, 54, 1, 1.4], 'dessert'],
    ['Chicken madeira', 500, 'plate', [1100, 85, 47, 62, 30, 10, 5, 5.5], ''],
    ['Louisiana chicken pasta', 600, 'plate', [1950, 72, 133, 125, 63, 12, 8, 7.5], ''],
  ]);
  add('Texas Roadhouse', 'texas roadhouse steakhouse', 'us', [
    ['6 oz sirloin', 170, 'steak', [250, 46, 0, 7, 3, 0, 0, 1.8], 'steak'],
    ['Dallas filet 8 oz', 227, 'steak', [370, 55, 0, 15, 6, 0, 0, 2], 'steak'],
    ['Roll with cinnamon butter', 75, 'roll', [260, 5, 34, 11, 5, 9, 1, 0.6], ''],
    ['Loaded baked potato', 400, 'potato', [610, 17, 70, 30, 15, 4, 7, 1.6], ''],
  ]);
  add('Outback Steakhouse', 'outback steakhouse', 'all', [
    ['Bloomin’ onion (whole, with sauce)', 750, 'onion', [1950, 18, 123, 155, 38, 19, 15, 9.4], 'share'],
    ['Center-cut sirloin 6 oz', 170, 'steak', [250, 44, 0, 8, 3, 0, 0, 1.5], 'steak'],
    ['Ribeye 12 oz', 340, 'steak', [920, 70, 0, 71, 31, 0, 0, 2.4], 'steak'],
  ]);
  add('Cinnabon', 'cinnabon cinnamon roll', 'all', [
    ['Classic roll', 255, 'roll', [880, 13, 127, 37, 17, 58, 3, 2.1], ''],
    ['MiniBon', 105, 'roll', [350, 5, 51, 15, 7, 23, 1, 0.8], ''],
    ['Cinnabon BonBites (4)', 80, 'portion', [320, 4, 48, 13, 6, 25, 1, 0.6], ''],
  ]);
  add("Auntie Anne's", 'auntie annes pretzel', 'all', [
    ['Original pretzel', 120, 'pretzel', [340, 10, 65, 4, 2, 11, 2, 2.4], ''],
    ['Cinnamon sugar pretzel', 135, 'pretzel', [470, 9, 84, 12, 6, 30, 2, 1.1], ''],
    ['Pretzel dogs (1)', 100, 'pretzel dog', [340, 12, 36, 16, 7, 6, 1, 2.3], ''],
  ]);
  add('Baskin-Robbins', 'baskin robbins ice cream', 'all', [
    ['Ice cream, 1 scoop (chocolate)', 113, 'scoop', [270, 5, 35, 14, 9, 30, 1, 0.3], 'dessert'],
    ['Ice cream, 1 scoop (vanilla)', 113, 'scoop', [260, 4, 28, 16, 10, 26, 0, 0.2], 'dessert'],
  ]);
  add('Smoothie King', 'smoothie king', 'us', [
    ['The Activator (strawberry banana, 20 oz)', 591, 'cup', [400, 26, 70, 2, 1, 47, 4, 0.5], 'protein', 1],
    ['Angel Food (20 oz)', 591, 'cup', [330, 7, 77, 0, 0, 68, 4, 0.3], '', 1],
  ]);
  add('Jamba', 'jamba juice smoothie', 'us', [
    ['Strawberry Wild smoothie (medium)', 650, 'cup', [300, 5, 70, 1, 0.5, 64, 4, 0.3], '', 1],
    ['Açaí Primo bowl', 450, 'bowl', [490, 8, 98, 9, 2, 64, 10, 0.2], ''],
  ]);
  add('White Castle', 'white castle slider', 'us', [
    ['Original slider', 60, 'slider', [140, 6, 13, 7, 2.5, 2, 1, 0.9], ''],
    ['Cheese slider', 70, 'slider', [170, 8, 14, 9, 4, 2, 1, 1.2], ''],
  ]);
  add("Steak 'n Shake", 'steak n shake', 'us', [
    ['Double steakburger with cheese', 220, 'burger', [530, 30, 34, 31, 13, 5, 1, 2.8], ''],
    ['Thin ’n crispy fries (regular)', 110, 'portion', [320, 4, 41, 16, 3, 0, 4, 0.9], ''],
  ]);
  add('A&W', 'a&w root beer burger', 'ca', [
    ['Teen Burger', 220, 'burger', [560, 31, 39, 31, 12, 8, 2, 2.9], 'canada'],
    ['Mama Burger', 160, 'burger', [370, 17, 32, 19, 6, 6, 1, 1.6], 'canada'],
    ['Onion rings (regular)', 100, 'portion', [310, 4, 37, 16, 2, 4, 3, 1.3], ''],
    ['Root beer (medium)', 600, 'drink', [270, 0, 73, 0, 0, 71, 0, 0.2], '', 1],
  ]);
  add("Harvey's", 'harveys canada burger', 'ca', [
    ['Original Harvey’s burger', 190, 'burger', [370, 22, 35, 16, 6, 7, 2, 1.5], 'canada'],
    ['Poutine (regular)', 400, 'portion', [740, 22, 76, 39, 18, 1, 6, 3.6], 'canada'],
  ]);
  add("Mary Brown's", 'mary browns chicken canada', 'ca', [
    ['Big Mary sandwich', 300, 'sandwich', [720, 38, 64, 34, 7, 8, 3, 4], 'canada'],
    ['Taters (regular)', 180, 'portion', [430, 6, 50, 22, 4, 0, 4, 2], 'potato wedges'],
  ]);
  add('Costco food court', 'costco food court', 'us', [
    ['Hot dog (quarter pound, bun)', 225, 'hot dog', [570, 24, 46, 32, 12, 7, 2, 3.8], ''],
    ['Cheese pizza (1 slice)', 290, 'slice', [700, 39, 75, 28, 14, 10, 4, 4], ''],
    ['Pepperoni pizza (1 slice)', 290, 'slice', [760, 41, 73, 35, 16, 10, 4, 4.5], ''],
    ['Chicken bake', 350, 'bake', [770, 45, 70, 34, 13, 6, 3, 5.5], ''],
    ['Rotisserie chicken (¼)', 250, 'portion', [500, 60, 0, 28, 8, 0, 0, 3.4], ''],
  ]);

  // ------------------------------------------------------------------ UK & Ireland
  add('Wasabi', 'wasabi sushi bento japanese', 'uk', [
    ['Chicken katsu curry (regular)', 450, 'box', [750, 28, 110, 21, 4, 10, 5, 2.4], ''],
    ['Chicken teriyaki rice (regular)', 420, 'box', [640, 33, 100, 11, 2.5, 18, 3, 3], ''],
    ['Salmon & avocado sushi set', 230, 'box', [420, 14, 65, 11, 2, 9, 3, 1.8], ''],
    ['Chicken gyoza (5)', 120, 'portion', [240, 12, 28, 9, 2, 3, 2, 1.4], ''],
  ]);
  add('YO! Sushi', 'yo sushi japanese', 'uk', [
    ['Salmon nigiri (2)', 70, 'plate', [110, 6, 16, 2.5, 0.5, 2, 0, 0.4], ''],
    ['California roll (4)', 120, 'plate', [200, 5, 30, 6, 1, 4, 1.5, 1], ''],
    ['Chicken katsu curry', 450, 'plate', [780, 30, 105, 26, 5, 10, 5, 2.6], ''],
    ['Pumpkin katsu curry', 450, 'plate', [720, 12, 115, 22, 3, 14, 8, 2.2], 'vegan'],
  ]);
  add('Chopstix', 'chopstix noodle bar', 'uk', [
    ['Box with noodles & salt and pepper chicken', 450, 'box', [800, 35, 100, 28, 4, 10, 5, 4], ''],
    ['Box with rice & katsu chicken', 450, 'box', [850, 32, 115, 28, 4, 15, 4, 3], ''],
  ]);
  add('Wahaca', 'wahaca mexican street food', 'uk', [
    ['Chicken tacos (3)', 240, 'portion', [430, 25, 40, 18, 5, 4, 6, 2], ''],
    ['Pork pibil burrito', 450, 'burrito', [800, 35, 90, 32, 12, 7, 10, 3.6], ''],
    ['Frijoles & tortilla chips', 200, 'portion', [450, 13, 50, 21, 4, 2, 10, 1.5], ''],
  ]);
  add('Honest Burgers', 'honest burgers', 'uk', [
    ['Honest burger with rosemary chips', 520, 'plate', [1200, 50, 95, 68, 25, 8, 7, 4.5], ''],
    ['Tribute burger', 330, 'burger', [880, 45, 45, 58, 25, 8, 2, 3.5], ''],
    ['Rosemary salted chips', 200, 'portion', [430, 5, 55, 21, 2, 0.5, 5, 1.4], ''],
  ]);
  add('Byron', 'byron burgers', 'uk', [
    ['Classic burger', 300, 'burger', [720, 40, 40, 44, 18, 7, 2, 2.6], ''],
    ['Skin-on fries', 180, 'portion', [430, 6, 55, 21, 2, 0.5, 5, 1], ''],
  ]);
  add('Franco Manca', 'franco manca sourdough pizza', 'uk', [
    ['Margherita (No. 3)', 400, 'pizza', [750, 30, 110, 20, 10, 6, 6, 3], ''],
    ['Chorizo & mozzarella (No. 4)', 420, 'pizza', [880, 38, 108, 32, 14, 6, 6, 4], ''],
  ]);
  add('Zizzi', 'zizzi italian restaurant', 'uk', [
    ['Rustica pizza, pepperoni', 450, 'pizza', [1050, 45, 115, 45, 20, 8, 6, 5], ''],
    ['Spaghetti carbonara', 450, 'plate', [900, 35, 90, 45, 22, 5, 4, 3.5], ''],
    ['Chicken & prosciutto penne', 450, 'plate', [850, 45, 80, 38, 18, 6, 4, 3.5], ''],
  ]);
  add('Prezzo', 'prezzo italian restaurant', 'uk', [
    ['Pepperoni pizza', 400, 'pizza', [960, 40, 110, 40, 18, 8, 5, 4.5], ''],
    ['Lasagne', 450, 'plate', [700, 35, 50, 40, 20, 8, 4, 3], ''],
  ]);
  add('Bella Italia', 'bella italia restaurant', 'uk', [
    ['Spaghetti bolognese', 450, 'plate', [650, 30, 85, 20, 7, 10, 6, 2.5], ''],
    ['Garlic bread with cheese', 150, 'portion', [480, 16, 50, 24, 12, 3, 2, 1.8], ''],
  ]);
  add("Frankie & Benny's", 'frankie and bennys restaurant', 'uk', [
    ['New York cheeseburger with fries', 600, 'plate', [1300, 55, 100, 75, 30, 10, 7, 5], ''],
    ['Chicken carbonara', 500, 'plate', [1100, 50, 90, 58, 30, 6, 4, 4], ''],
  ]);
  add('TGI Fridays', 'tgi fridays restaurant', 'all', [
    ['Jack Daniel’s glazed ribs (full rack) with fries', 750, 'plate', [1600, 80, 140, 75, 25, 70, 8, 7], ''],
    ['Loaded potato skins', 300, 'portion', [750, 30, 40, 52, 25, 3, 4, 3], ''],
  ]);
  add('Wetherspoons', 'wetherspoons spoons pub', 'uk', [
    ['Traditional breakfast', 500, 'plate', [950, 50, 55, 60, 20, 10, 8, 5.5], ''],
    ['Fish & chips with peas', 650, 'plate', [1300, 50, 130, 65, 8, 4, 12, 3], ''],
    ['Classic beef burger with chips', 550, 'plate', [1100, 50, 100, 55, 20, 10, 8, 4], ''],
    ['Chicken tikka masala with rice', 550, 'plate', [900, 40, 110, 32, 12, 12, 6, 4], 'curry club'],
    ['Steak (rump 8 oz) with chips & peas', 600, 'plate', [1100, 70, 90, 50, 18, 3, 10, 2], ''],
    ['Gourmet pizza, pepperoni', 400, 'pizza', [1000, 42, 110, 42, 18, 8, 6, 5], ''],
  ]);
  add('Toby Carvery', 'toby carvery roast', 'uk', [
    ['Carvery (turkey, roast potatoes, veg, Yorkshire, gravy)', 650, 'plate', [950, 55, 95, 38, 10, 12, 12, 3.5], 'sunday roast'],
    ['Carvery (beef)', 650, 'plate', [1000, 60, 95, 42, 13, 12, 12, 3.5], 'sunday roast'],
  ]);
  add('Harvester', 'harvester restaurant', 'uk', [
    ['Half rotisserie chicken with fries', 550, 'plate', [1050, 70, 60, 58, 15, 3, 6, 3.5], ''],
    ['Salad bar (one bowl)', 300, 'bowl', [250, 7, 25, 14, 2, 8, 5, 1.5], ''],
  ]);
  add('Dishoom', 'dishoom indian bombay', 'uk', [
    ['Bacon naan roll', 220, 'roll', [600, 25, 60, 28, 10, 6, 3, 3.5], 'breakfast'],
    ['House black daal', 300, 'bowl', [450, 15, 35, 28, 16, 4, 10, 2.5], ''],
    ['Chicken ruby', 350, 'bowl', [500, 35, 15, 33, 14, 8, 3, 2.5], 'curry'],
    ['Garlic naan', 130, 'naan', [400, 10, 60, 13, 6, 4, 3, 1.5], ''],
  ]);
  add('Caffè Nero', 'caffe nero coffee', 'uk', [
    ['Latte (regular, semi-skimmed)', 340, 'cup', [130, 9, 13, 5, 3, 13, 0, 0.3], 'coffee', 1],
    ['Flat white', 250, 'cup', [100, 6, 9, 4, 2.5, 9, 0, 0.2], 'coffee', 1],
    ['Ham & mozzarella panini', 180, 'panini', [430, 23, 46, 16, 7, 3, 3, 2.4], ''],
    ['Brie, bacon & cranberry panini', 190, 'panini', [500, 22, 48, 23, 12, 7, 2, 2.4], ''],
    ['Chocolate twist', 95, 'pastry', [380, 6, 42, 20, 12, 15, 2, 0.5], ''],
  ]);
  add("Gail's", 'gails bakery', 'uk', [
    ['Cinnamon bun', 120, 'bun', [450, 8, 55, 22, 12, 22, 2, 0.6], ''],
    ['Sourdough loaf slice', 50, 'slice', [120, 4.5, 24, 0.6, 0.1, 0.5, 1.5, 0.5], ''],
    ['Chocolate chip cookie', 90, 'cookie', [420, 5, 52, 21, 12, 30, 2, 0.5], ''],
  ]);
  add('Boots meal deal', 'boots meal deal sandwich', 'uk', [
    ['Shapers sandwich (chicken & salad)', 170, 'sandwich', [290, 23, 35, 6, 1, 4, 4, 1.4], 'healthy'],
    ['BLT sandwich', 180, 'sandwich', [430, 18, 40, 21, 4.5, 5, 4, 2.4], ''],
    ['Chicken & bacon pasta pot', 300, 'pot', [560, 28, 50, 27, 4, 4, 3, 2.1], ''],
  ]);
  add('Tesco meal deal', 'tesco meal deal sandwich', 'uk', [
    ['Chicken & bacon sandwich', 190, 'sandwich', [460, 26, 38, 22, 4.5, 4, 3, 2.1], ''],
    ['Egg mayo sandwich', 170, 'sandwich', [360, 14, 34, 18, 3.5, 3, 4, 1.4], ''],
    ['Southern fried chicken wrap', 210, 'wrap', [510, 21, 54, 22, 3.5, 5, 4, 2.2], ''],
    ['Chicken Caesar pasta salad', 280, 'pot', [520, 24, 48, 25, 4, 3, 3, 1.8], ''],
    ['Prawn mayo sandwich', 170, 'sandwich', [360, 15, 32, 19, 2, 3, 3, 1.5], ''],
  ]);
  add('M&S Food', 'marks and spencer m&s sandwich', 'uk', [
    ['Our Best Ever chicken & bacon sandwich', 220, 'sandwich', [560, 33, 40, 28, 6, 3, 3, 2.4], ''],
    ['Percy Pig sweets (bag)', 170, 'bag', [580, 10, 135, 0.2, 0, 90, 0, 0.1], 'sweets'],
    ['Count on Us chicken salad', 250, 'pot', [240, 20, 28, 5, 1, 5, 4, 1], 'healthy'],
  ]);
  add("Supermac's", 'supermacs ireland', 'uk', [
    ['Snack box (2 chicken, chips)', 450, 'box', [1150, 50, 90, 62, 10, 1, 8, 4], 'irish'],
    ['Quarter pounder', 220, 'burger', [580, 30, 40, 32, 13, 8, 2, 2.6], 'irish'],
    ['Taco fries', 400, 'portion', [850, 24, 85, 46, 15, 5, 8, 3], 'irish'],
  ]);
  add('Apache Pizza', 'apache pizza ireland', 'uk', [
    ['Pepperoni pizza (medium, 1 slice)', 100, 'slice', [270, 12, 30, 11, 5, 2.5, 1.5, 1.4], 'irish'],
    ['Wedges', 200, 'portion', [370, 6, 50, 15, 2, 1, 5, 1.4], 'irish'],
  ]);
  add('Insomnia', 'insomnia coffee ireland', 'uk', [
    ['Latte (regular)', 340, 'cup', [140, 9, 13, 6, 3.5, 13, 0, 0.3], 'coffee irish', 1],
    ['Breakfast roll (sausage, rasher, egg)', 260, 'roll', [720, 30, 55, 40, 14, 4, 3, 4], 'irish chicken fillet roll'],
    ['Chicken fillet roll (spicy, with mayo)', 280, 'roll', [700, 33, 70, 31, 5, 4, 3, 3.5], 'irish'],
  ]);

  // ------------------------------------------------------------------ Europe
  add('PAUL', 'paul boulangerie bakery france', 'eu', [
    ['Croissant', 60, 'croissant', [250, 5, 26, 14, 9, 4, 1.5, 0.6], ''],
    ['Pain au chocolat', 75, 'pastry', [310, 6, 32, 18, 11, 10, 2, 0.5], ''],
    ['Jambon beurre baguette', 230, 'baguette', [550, 26, 70, 18, 10, 3, 3, 3.3], 'ham butter sandwich'],
    ['Croque monsieur', 200, 'croque', [520, 26, 40, 28, 15, 4, 2, 2.6], ''],
    ['Éclair au chocolat', 90, 'éclair', [290, 5, 33, 15, 9, 20, 1, 0.3], ''],
    ['Quiche Lorraine (slice)', 180, 'slice', [520, 17, 33, 36, 18, 3, 1.5, 1.6], ''],
  ]);
  add('Brioche Dorée', 'brioche doree france bakery', 'eu', [
    ['Sandwich jambon emmental', 220, 'sandwich', [560, 28, 62, 21, 11, 3, 3, 3], ''],
    ['Pain aux raisins', 110, 'pastry', [370, 7, 50, 16, 9, 22, 2, 0.6], ''],
  ]);
  add('Le Pain Quotidien', 'le pain quotidien cafe belgium', 'eu', [
    ['Avocado toast', 200, 'toast', [420, 10, 40, 24, 4, 3, 9, 1.4], ''],
    ['Belgian waffle', 120, 'waffle', [450, 7, 55, 22, 12, 22, 2, 0.6], ''],
  ]);
  add('Exki', 'exki belgium healthy', 'eu', [
    ['Chicken wrap', 220, 'wrap', [420, 22, 42, 17, 3, 4, 3, 2], ''],
    ['Quinoa salad', 300, 'bowl', [380, 12, 40, 18, 2.5, 6, 7, 1.5], 'healthy'],
  ]);
  add('Panos', 'panos belgium sandwich', 'eu', [
    ['Smos kaas & hesp (ham & cheese baguette with salad)', 280, 'baguette', [600, 28, 65, 25, 10, 5, 4, 3], ''],
    ['Martino sandwich', 250, 'baguette', [520, 25, 60, 20, 5, 6, 3, 3], 'filet americain'],
  ]);
  add('FEBO', 'febo netherlands snack automatiek', 'eu', [
    ['Kroket', 70, 'kroket', [190, 5, 16, 12, 3.5, 1, 1, 1.1], 'croquette dutch'],
    ['Kaassoufflé', 70, 'soufflé', [240, 7, 18, 16, 6, 1, 1, 1.2], 'cheese dutch'],
    ['Frikandel', 70, 'frikandel', [170, 8, 6, 13, 5, 1, 0.5, 1.2], 'dutch'],
    ['Patat (medium) with mayo', 250, 'portion', [700, 7, 72, 42, 4, 2, 7, 1.2], 'fries dutch'],
    ['Bamischijf', 90, 'piece', [230, 5, 25, 12, 3, 2, 1.5, 1.2], 'dutch'],
  ]);
  add('Smullers', 'smullers netherlands station snack', 'eu', [
    ['Broodje kroket', 130, 'roll', [360, 10, 40, 17, 5, 3, 2, 1.8], 'dutch'],
    ['Patat met (medium)', 230, 'portion', [640, 7, 70, 37, 4, 2, 6, 1.1], 'fries dutch'],
  ]);
  add('Ditsch', 'ditsch brezel pretzel germany', 'eu', [
    ['Laugenbrezel', 90, 'pretzel', [270, 8, 54, 2.5, 0.4, 1, 2.5, 2.8], 'pretzel'],
    ['Butterbrezel', 110, 'pretzel', [380, 8, 54, 14, 9, 1, 2.5, 2.8], 'pretzel butter'],
    ['Pizza-Brezel (cheese)', 150, 'pretzel', [420, 15, 55, 15, 8, 3, 3, 3], ''],
  ]);
  add('Backwerk', 'backwerk bakery germany', 'eu', [
    ['Laugenstange with cheese', 110, 'stick', [340, 12, 45, 12, 6, 1, 2, 2.4], ''],
    ['Schinken-Käse-Croissant', 120, 'croissant', [420, 15, 32, 26, 14, 3, 1.5, 1.6], ''],
    ['Belegtes Brötchen (salami)', 150, 'roll', [420, 15, 45, 19, 7, 2, 3, 2.6], 'sandwich'],
  ]);
  add('Kamps', 'kamps bakery germany', 'eu', [
    ['Mohnbrötchen', 60, 'roll', [170, 6, 30, 3, 0.4, 1, 2, 0.8], 'roll'],
    ['Berliner (jam doughnut)', 80, 'doughnut', [290, 5, 40, 12, 5, 18, 1, 0.3], ''],
  ]);
  add('Hans im Glück', 'hans im gluck burger germany', 'eu', [
    ['Burger (beef, classic)', 330, 'burger', [800, 40, 55, 46, 18, 10, 3, 3.5], ''],
    ['Süßkartoffelpommes', 200, 'portion', [430, 4, 55, 21, 2, 15, 7, 1.4], 'sweet potato fries'],
  ]);
  add('Burgermeister', 'burgermeister berlin', 'eu', [
    ['Meisterburger', 300, 'burger', [720, 38, 45, 42, 17, 8, 2, 3.2], ''],
    ['Chili cheese fries', 300, 'portion', [750, 16, 65, 48, 18, 3, 6, 2.6], ''],
  ]);
  add("L'Osteria", 'losteria pizza pasta germany', 'eu', [
    ['Pizza Margherita (Ø 45 cm, whole)', 750, 'pizza', [1600, 65, 230, 45, 22, 15, 10, 6], 'italian'],
    ['Spaghetti bolognese', 450, 'plate', [700, 30, 90, 22, 8, 10, 6, 2.5], ''],
  ]);
  add('dean&david', 'dean and david salad bowl', 'eu', [
    ['Chicken curry bowl', 450, 'bowl', [650, 35, 70, 22, 8, 10, 7, 2.5], ''],
    ['Caesar salad', 350, 'bowl', [520, 30, 20, 35, 8, 4, 4, 2.5], ''],
  ]);
  add('Wienerwald', 'wienerwald chicken austria', 'eu', [
    ['Half grilled chicken', 300, 'half', [600, 60, 0, 40, 11, 0, 0, 2.4], 'hendl'],
    ['Backhendl with potato salad', 450, 'plate', [900, 45, 60, 52, 9, 4, 5, 3], ''],
  ]);
  add('Spontini', 'spontini pizza milano', 'eu', [
    ['Pizza al trancio, margherita (slice)', 300, 'slice', [700, 26, 85, 28, 14, 6, 4, 3], 'italian thick'],
  ]);
  add('Autogrill', 'autogrill italy motorway', 'eu', [
    ['Camogli (ham & cheese focaccia)', 160, 'sandwich', [450, 20, 50, 18, 8, 2, 2, 2.4], 'italian'],
    ['Rustichella (ham, mozzarella)', 180, 'sandwich', [470, 22, 52, 18, 8, 2, 2, 2.4], 'italian'],
  ]);
  add('Old Wild West', 'old wild west italy steakhouse', 'eu', [
    ['Cheeseburger with chips', 550, 'plate', [1150, 50, 90, 65, 25, 8, 7, 4], ''],
  ]);
  add('100 Montaditos', '100 montaditos spain', 'eu', [
    ['Montadito (jamón serrano)', 55, 'montadito', [150, 7, 18, 5, 1.5, 1, 1, 1.2], 'spanish mini sandwich'],
    ['Montadito (pollo & alioli)', 60, 'montadito', [180, 7, 18, 9, 1.5, 1, 1, 0.9], 'spanish mini sandwich'],
    ['Patatas con alioli', 200, 'portion', [500, 5, 45, 33, 3, 1, 4, 1.2], ''],
  ]);
  add('Rodilla', 'rodilla spain sandwich', 'eu', [
    ['Sandwich mixto (ham & cheese)', 80, 'sandwich', [230, 11, 22, 11, 5, 2, 1, 1.4], 'spanish'],
    ['Ensaladilla rusa sandwich', 80, 'sandwich', [240, 6, 22, 14, 2, 2, 1, 1], 'spanish'],
  ]);
  add('Goiko', 'goiko grill burger spain', 'eu', [
    ['Kevin Bacon burger', 400, 'burger', [1000, 50, 50, 66, 28, 8, 3, 4], ''],
    ['Bacon cheese fries', 300, 'portion', [800, 20, 60, 52, 20, 2, 6, 3], ''],
  ]);
  add('Pans & Company', 'pans and company spain bocadillo', 'eu', [
    ['Bocadillo de pollo', 220, 'bocadillo', [500, 25, 58, 18, 3.5, 3, 3, 2.4], 'spanish'],
    ['Bocadillo de jamón con tomate', 200, 'bocadillo', [460, 22, 58, 15, 4, 3, 3, 3.6], 'spanish'],
  ]);
  add('Foster’s Hollywood', 'fosters hollywood spain', 'eu', [
    ['Director’s Choice burger with fries', 600, 'plate', [1300, 55, 100, 75, 28, 10, 7, 5], ''],
  ]);
  add('VIPS', 'vips spain restaurant', 'eu', [
    ['Club sandwich VIPS', 350, 'sandwich', [750, 40, 55, 40, 12, 6, 4, 3.6], 'spanish'],
    ['Tortitas (pancakes) with syrup', 250, 'portion', [600, 10, 95, 20, 8, 45, 2, 1.2], 'spanish'],
  ]);
  add('Pastelaria (Portugal)', 'pastelaria portugal cafe', 'eu', [
    ['Pastel de nata', 60, 'tart', [180, 3, 20, 10, 5, 11, 0.5, 0.2], 'custard tart'],
    ['Bola de Berlim', 100, 'doughnut', [380, 7, 45, 19, 7, 20, 1, 0.4], 'portuguese'],
    ['Tosta mista', 150, 'toastie', [380, 18, 38, 17, 9, 3, 2, 2], 'portuguese ham cheese'],
    ['Galão', 250, 'glass', [90, 5, 8, 4, 2.5, 8, 0, 0.1], 'portuguese coffee', 1],
  ]);
  add('Goody’s', 'goodys greece burger', 'eu', [
    ['Club sandwich', 300, 'sandwich', [700, 35, 55, 37, 11, 6, 4, 3.5], 'greek'],
    ['Burger with cheese', 200, 'burger', [520, 25, 40, 28, 11, 7, 2, 2.4], 'greek'],
  ]);
  add('Everest', 'everest greece', 'eu', [
    ['Tost (ham & cheese)', 150, 'toast', [380, 18, 40, 16, 8, 3, 2, 2.2], 'greek'],
    ['Koulouri Thessalonikis', 90, 'ring', [290, 9, 52, 5, 0.7, 3, 3, 0.9], 'greek sesame bread'],
  ]);
  add('Simit Sarayı', 'simit sarayi turkey', 'eu', [
    ['Simit', 100, 'simit', [330, 10, 58, 7, 1, 5, 3, 1.1], 'turkish sesame bread'],
    ['Poğaça (cheese)', 80, 'poğaça', [300, 8, 32, 15, 6, 2, 1, 0.8], 'turkish'],
  ]);
  add('North Fish', 'north fish poland', 'eu', [
    ['Fish & chips', 400, 'portion', [850, 35, 80, 42, 5, 2, 7, 2], 'polish'],
  ]);
  add('Żabka', 'zabka poland convenience', 'eu', [
    ['Hot dog (Żabka)', 160, 'hot dog', [420, 14, 42, 22, 8, 6, 2, 2.4], 'polish'],
    ['Panini z kurczakiem', 180, 'panini', [440, 22, 48, 17, 6, 4, 3, 2.2], 'polish chicken'],
  ]);
  add('Espresso House', 'espresso house nordics coffee', 'eu', [
    ['Latte (medium)', 400, 'cup', [170, 11, 17, 6.5, 4, 17, 0, 0.3], 'coffee', 1],
    ['Kanelbulle', 90, 'bun', [350, 6, 50, 14, 7, 20, 2, 0.5], 'cinnamon bun swedish'],
    ['Chokladboll', 50, 'ball', [230, 3, 25, 13, 8, 18, 2, 0.1], 'swedish chocolate ball'],
  ]);
  add('Pressbyrån / 7-Eleven', '7 eleven pressbyran convenience', 'all', [
    ['Hot dog in bread (Swedish)', 110, 'hot dog', [300, 10, 30, 15, 6, 4, 1.5, 1.8], 'korv med bröd'],
    ['Big Bite hot dog', 200, 'hot dog', [520, 18, 40, 32, 12, 6, 2, 3], 'usa'],
    ['Slurpee (medium)', 600, 'cup', [210, 0, 54, 0, 0, 54, 0, 0], 'frozen drink', 1],
  ]);
  add('Sibylla', 'sibylla sweden', 'eu', [
    ['Hamburgare', 180, 'burger', [430, 20, 38, 22, 8, 6, 2, 2], 'swedish'],
    ['Tunnbrödsrulle', 400, 'wrap', [900, 25, 90, 48, 16, 6, 6, 4], 'swedish hot dog wrap mash'],
  ]);
  add('Max', 'max burgers sweden', '', [
    ['Grand Deluxe', 300, 'burger', [780, 40, 50, 46, 17, 10, 3, 3.2], ''],
    ['Crispy chicken burger', 230, 'burger', [580, 24, 55, 29, 4, 7, 3, 2.4], ''],
    ['Fries (medium)', 130, 'portion', [380, 5, 45, 20, 2, 0.5, 4, 0.8], ''],
  ]);
  add('Hesburger', 'hesburger finland baltics', '', [
    ['Kerroshampurilainen (double burger)', 220, 'burger', [560, 28, 40, 32, 11, 7, 2, 2.6], ''],
    ['Kana-ateria (chicken burger meal)', 550, 'meal', [1100, 35, 120, 52, 7, 40, 7, 3.6], ''],
  ]);
  add('IKEA', 'ikea restaurant bistro', 'all', [
    ['Meatballs (10) with mash, gravy & lingonberries', 400, 'plate', [690, 26, 55, 40, 14, 18, 5, 3.3], 'swedish kottbullar'],
    ['Meatballs (15) with mash, gravy & lingonberries', 500, 'plate', [920, 36, 62, 56, 20, 19, 6, 4.5], 'swedish kottbullar'],
    ['Plant balls (10) with mash', 400, 'plate', [600, 18, 60, 30, 6, 18, 9, 3], 'vegan'],
    ['Salmon fillet with potatoes', 400, 'plate', [550, 35, 35, 28, 6, 3, 4, 1.4], ''],
    ['Hot dog (bistro)', 110, 'hot dog', [260, 9, 28, 12, 4.5, 4, 1.5, 1.6], ''],
    ['Veggie hot dog (bistro)', 120, 'hot dog', [200, 6, 32, 5, 0.5, 5, 3, 1.4], 'vegan'],
    ['Cinnamon bun (kanelbulle)', 70, 'bun', [260, 5, 38, 9, 4, 13, 1.5, 0.4], 'swedish'],
    ['Daim cake (slice)', 85, 'slice', [400, 5, 40, 24, 12, 34, 1, 0.3], 'almond cake'],
    ['Frozen yogurt cone', 120, 'cone', [140, 4, 26, 2, 1.3, 20, 0, 0.1], 'dessert'],
  ]);
  add('Telepizza', 'telepizza pizza spain portugal', '', [
    ['Barbacoa pizza (medium, 1 slice)', 110, 'slice', [270, 12, 30, 11, 5, 4, 1.5, 1.4], ''],
    ['Pan de ajo', 150, 'portion', [450, 10, 55, 20, 7, 3, 3, 1.8], 'garlic bread'],
  ]);
  add('Quick', 'quick burger belgium france', '', [
    ['Giant', 230, 'burger', [580, 28, 45, 31, 11, 8, 3, 2.5], ''],
    ['Long Bacon', 220, 'burger', [580, 25, 48, 32, 10, 5, 3, 2.8], ''],
  ]);
  add('Vapiano', 'vapiano pasta italian', '', [
    ['Pizza margherita', 450, 'pizza', [900, 35, 130, 26, 12, 8, 6, 4], ''],
    ['Pasta carbonara', 450, 'plate', [950, 38, 95, 45, 22, 5, 4, 3.5], ''],
  ]);

  // Skip anything fastfood.js already has (same chain + same item name), keeping ids stable.
  const key = f => f.name.toLowerCase().replace(/\(([^)]*)\)\s*$/, '|$1').replace(/[^a-z0-9|]+/g, '');
  const have = new Set(window.BUILTIN_FOODS.filter(f => f.cat === 'Fast food').map(key));
  window.BUILTIN_FOODS.push(...L.filter(f => !have.has(key(f))));
})();

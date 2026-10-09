/* =========================================================
   Jimmi Store — Product & category data (PRO)
   Ratings, MRP, stock, veg, trending added for 100% ecom feel
   ========================================================= */

const U = (id, w = 600) => {
  if (!id) return '';
  if (String(id).startsWith('http')) return id;
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
};

/* Real-photo fallback so the UI never shows a broken image */
const FALLBACK_IMG = U('1767032916116-2460bbd4a27d', 800);

/* Category meta with trending flag */
const CATEGORIES = [
  { id: 'fresh',   name: 'Fruits & Vegetables',  photo: '1693400083666-1175e90da1eb', desc: 'Farm-fresh daily harvest' },
  { id: 'sweet',   name: 'Chocolates & Biscuits', photo: '1575377427642-087cf684f29d', desc: 'Indulgent treats & snacks' },
  { id: 'dairy',   name: 'Dairy & Bakery',        photo: '1760822601183-4a75e9389f59', desc: 'Milk, eggs, bread & bakes' },
  { id: 'pantry',  name: 'Pantry Staples',        photo: '1623345260599-6f5cba600f6a', desc: 'Rice, atta, oil & more' },
  { id: 'beverage', name: 'Beverages',            photo: '1660470878583-241d2852642d', desc: 'Juices, sodas & refreshers' },
];

/* Helper to compute MRP + discount% */
const mk = (price, mrp, rating, reviews, stock, veg) => ({ price, mrp: mrp || Math.round(price*1.18), rating: rating||4.4, reviews: reviews||124, stock: stock|| (Math.random()>0.08? 32: 4), veg: veg!==false });

const PRODUCTS = [
  /* ---- Fruits & Vegetables ---- */
  { id: 'p1',  cat: 'fresh', name: 'Alphonso Mangoes', meta: '1 kg · Ratnagiri',     price: 249, photo: '1550825488-af28862c0df5', badge: { text: 'Best Seller', type: 'best' }, ...mk(249, 299, 4.8, 842, 18, true),  desc: 'Sun-ripened Ratnagiri Alphonsos — naturally sweet, handpicked at peak ripeness. Rich aroma, buttery pulp.' },
  { id: 'p2',  cat: 'fresh', name: 'Baby Spinach',     meta: '200 g · Pesticide-free', price: 39,  photo: '1519995672084-d21490e86ba6', badge: { text: 'Fresh', type: 'fresh' }, ...mk(39, 49, 4.6, 312, 42, true), desc: 'Tender hydroponic baby spinach, triple-washed. Iron-rich and ready to sauté.' },
  { id: 'p3',  cat: 'fresh', name: 'Red Tomatoes',     meta: '1 kg · Farm fresh',    price: 45,  photo: '1553877679-66548171b5f5', badge: { text: '-10%', type: 'off' }, ...mk(45, 50, 4.5, 521, 6, true), desc: 'Vine-ripened, firm red tomatoes ideal for curries and sauces.' },
  { id: 'p4',  cat: 'fresh', name: 'Broccoli',         meta: '500 g · Hill-grown',   price: 69,  photo: '1685504445355-0e7bdf90d415', badge: { text: 'Fresh', type: 'fresh' }, ...mk(69, 79, 4.7, 198, 22, true), desc: 'Compact florets, hill-grown and pesticide-checked.' },
  { id: 'p5',  cat: 'fresh', name: 'Carrots',          meta: '500 g · Ooty',         price: 35,  photo: '1748118869623-9607a2d4e5f9', ...mk(35, 40, 4.6, 267, 54, true), desc: 'Crunchy Ooty carrots — sweet, vibrant orange, great raw or cooked.' },
  { id: 'p6',  cat: 'fresh', name: 'Seedless Grapes',  meta: '500 g · Nashik',       price: 79,  photo: '1736333568797-48339dc1b042', badge: { text: 'Best Seller', type: 'best' }, ...mk(79, 99, 4.8, 634, 14, true), desc: 'Plump Nashik seedless — snappy and sweet, perfect for snacking.' },
  { id: 'p7',  cat: 'fresh', name: 'Banana',           meta: '1 dozen · Robusta',    price: 49,  photo: '1718354465926-c1581c368f77', ...mk(49, 60, 4.5, 412, 38, true), desc: 'Naturally ripened Robusta bananas — creamy and filling.' },
  { id: 'p8',  cat: 'fresh', name: 'Shimla Apple',     meta: '1 kg · Himachal',      price: 89,  photo: '1587314168485-3236d6710814', ...mk(89, 119, 4.7, 523, 9, true), desc: 'Juicy Himachali apples — crisp bite, naturally sweet.' },
  { id: 'p9',  cat: 'fresh', name: 'Potato',           meta: '1 kg · Washed',        price: 25,  photo: '1718096125279-15f47cab1cc9', ...mk(25, 30, 4.4, 189, 88, true), desc: 'Grade-A washed potatoes — daily harvest, stored cool.' },
  { id: 'p10', cat: 'fresh', name: 'Cucumber',         meta: '500 g · English',      price: 29,  photo: '1689031831628-a3c200fb1768', ...mk(29, 35, 4.3, 142, 26, true), desc: 'Cool, seedless English cucumbers — hydration powerhouse.' },
  { id: 'p11', cat: 'fresh', name: 'Green Capsicum',   meta: '500 g',                price: 55,  photo: '1565685104448-45e775f05554', ...mk(55, 65, 4.5, 176, 16, true), desc: 'Glossy green capsicums — fresh crunch for stir-fries.' },
  { id: 'p12', cat: 'fresh', name: 'Strawberries',     meta: '250 g · Mahabaleshwar',price: 99,  photo: '1693400083666-1175e90da1eb', ...mk(99, 129, 4.7, 298, 5, true), desc: 'Mahabaleshwar strawberries — fragrant, ruby-red, handpicked.' },
  { id: 'p32', cat: 'fresh', name: 'Avocado',          meta: '3 pcs · Hass · Ripe',   price: 149, photo: '1526948128573-70328f88d57e', badge: { text: 'Fresh', type: 'fresh' }, ...mk(149, 199, 4.6, 211, 7, true), desc: 'Creamy Hass avocados — ready to eat, rich in healthy fats.' },

  /* ---- Chocolates & Biscuits ---- */
  { id: 'p13', cat: 'sweet', name: 'Dark Chocolate 70%', meta: '100 g bar',          price: 189, photo: '1575377427642-087cf684f29d', badge: { text: '-15%', type: 'off' }, ...mk(189, 220, 4.8, 612, 24, true), desc: '70% single-origin dark — intense, smooth, small-batch roasted.' },
  { id: 'p14', cat: 'sweet', name: 'Butter Biscuits',    meta: 'Pack of 2',         price: 59,  photo: '1513519683267-4ee6761728ac', ...mk(59, 70, 4.5, 342, 44, true), desc: 'Melt-in-mouth butter biscuits — baked with pure butter.' },
  { id: 'p15', cat: 'sweet', name: 'Assorted Truffles',  meta: 'Box of 12',         price: 349, photo: '1578985541837-2f5d97b82fc0', badge: { text: 'Best Seller', type: 'best' }, ...mk(349, 399, 4.9, 421, 12, true), desc: 'Assorted truffles — milk, dark & hazelnut, gifting favorite.' },
  { id: 'p16', cat: 'sweet', name: 'Choco-chip Muffins', meta: 'Pack of 4',         price: 129, photo: '1647617587049-559e8ae530e6', badge: { text: 'Fresh', type: 'fresh' }, ...mk(129, 149, 4.6, 198, 10, true), desc: 'Soft muffins loaded with choco chips — baked today.' },
  { id: 'p17', cat: 'sweet', name: 'Digestive Biscuits', meta: 'Family pack',       price: 75,  photo: '1587131782738-de30ea91a542', ...mk(75, 85, 4.4, 267, 36, true), desc: 'Whole-wheat digestives — crunchy, high-fibre.' },
  { id: 'p18', cat: 'sweet', name: 'Milk Chocolate',     meta: '80 g bar',          price: 99,  photo: '1610616825521-0a0d81e3c5dc', badge: { text: '-10%', type: 'off' }, ...mk(99, 110, 4.7, 334, 19, true), desc: 'Creamy milk chocolate — childhood favorite.' },
  { id: 'p19', cat: 'sweet', name: 'Chocolate Cookies',  meta: '200 g',             price: 65,  photo: '1499636130406-85a9019d1a84', ...mk(65, 80, 4.5, 201, 28, true), desc: 'Chunky cookies with Belgian chips — chewy centre.' },
  { id: 'p20', cat: 'sweet', name: 'Premium Chocolate',  meta: '150 g',             price: 159, photo: '1606312619070-d48b4c652a07', ...mk(159, 185, 4.8, 188, 15, true), desc: 'Premium selection — silky, slow-conched.' },

  /* ---- Dairy & Bakery ---- */
  { id: 'p21', cat: 'dairy', name: 'Fresh Milk',        meta: '1 L · Full cream',   price: 32, photo: '1550581053574-44363a5f9a94', ...mk(32, 35, 4.8, 892, 62, true), desc: 'Full-cream, pasteurized milk — farm-collected within 12 hours.' },
  { id: 'p22', cat: 'dairy', name: 'Farm Eggs',         meta: 'Pack of 6',         price: 42, photo: '1482049016688-d3d92833972f', ...mk(42, 50, 4.7, 445, 31, false), desc: 'Free-range eggs — protein-rich, antibiotic-free.' },
  { id: 'p23', cat: 'dairy', name: 'Whole Wheat Bread', meta: '400 g loaf',         price: 45, photo: '1509440159596-0249088772ff', ...mk(45, 55, 4.5, 312, 8, true), desc: 'Soft whole-wheat loaf — no maida, baked dawn daily.' },
  { id: 'p24', cat: 'dairy', name: 'Butter Croissant',  meta: '2 pcs',             price: 60, photo: '1555507036152-603dd3f3c3d0', ...mk(60, 75, 4.6, 167, 6, true), desc: 'Flaky butter croissants — laminated, golden-baked.' },

  /* ---- Pantry Staples ---- */
  { id: 'p25', cat: 'pantry', name: 'Basmati Rice',   meta: '1 kg · Extra long',   price: 95, photo: '1623345260599-6f5cba600f6a', ...mk(95, 120, 4.7, 534, 40, true), desc: 'Extra-long aged basmati — aromatic, non-sticky grains.' },
  { id: 'p26', cat: 'pantry', name: 'Wheat Atta',     meta: '1 kg · Sharbati',     price: 45, photo: '1574323344916-e191415e7326', ...mk(45, 55, 4.6, 298, 52, true), desc: 'Sharbati wheat atta — stone-ground, soft rotis.' },
  { id: 'p27', cat: 'pantry', name: 'Sugar',          meta: '1 kg · Refined',      price: 42, photo: '1622483760397-1a374ef9d75c', ...mk(42, 48, 4.4, 201, 70, true), desc: 'Double-refined sulphur-free sugar — dissolves clean.' },
  { id: 'p28', cat: 'pantry', name: 'Tea Leaves',     meta: '250 g · Assam',       price: 120, photo: '1576092762793-c0b9396b14ae', ...mk(120, 145, 4.8, 412, 34, true), desc: 'Second-flush Assam — strong, malty, CTC + orthodox blend.' },
  { id: 'p29', cat: 'pantry', name: 'Coffee Powder',  meta: '200 g · Filter',      price: 150, photo: '1442557702544-d3364f08ef5e', ...mk(150, 175, 4.7, 267, 18, true), desc: 'South Indian filter kaapi — chicory blend, aromatic.' },

  /* ---- Beverages ---- */
  { id: 'p30', cat: 'beverage', name: 'Orange Juice',  meta: '1 L · No added sugar', price: 89, photo: '1621506284645-9e021e85cf47', ...mk(89, 110, 4.6, 334, 22, true), desc: 'Cold-pressed Nagpur oranges — no added sugar, flash-pasteurized.' },
  { id: 'p31', cat: 'beverage', name: 'Cola Soft Drink', meta: '750 ml',           price: 40, photo: '1624553669111-515a8b021a24', ...mk(40, 45, 4.3, 189, 47, true), desc: 'Classic cola — chilled, fizzy refreshment.' },
];

/* Trending + Frequently bought combos */
const TRENDING_IDS = ['p1','p6','p13','p21','p25','p30'];
const COMBO_GROUPS = [
  { title: 'Breakfast combo', ids: ['p23','p21','p22'], save: 18 },
  { title: 'Evening snacks', ids: ['p14','p18','p30'], save: 22 },
  { title: 'Fresh basket', ids: ['p1','p6','p8'], save: 30 },
];

/* Fruit photos used as the loading-screen background collage */
const LOADER_PHOTOS = [
  '1550825488-af28862c0df5', '1519995672084-d21490e86ba6', '1553877679-66548171b5f5',
  '1685504445355-0e7bdf90d415', '1748118869623-9607a2d4e5f9', '1736333568797-48339dc1b042',
  '1718354465926-c1581c368f77', '1587314168485-3236d6710814', '1718096125279-15f47cab1cc9',
  '1693400083666-1175e90da1eb',
].map(id => U(id, 300));

/* Search trending keywords */
const TRENDING_SEARCHES = ['mango','milk','bread','chocolate','grapes','rice','spinach','juice','biscuits'];
const RECENT_SEARCH_KEY = 'jimmi_recent_searches';
const RECENT_VIEW_KEY = 'jimmi_recent_views';

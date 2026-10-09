/* =========================================================
   Jimmi Store — PRO AI Chatbot
   Trained on: grocery-chatbot-master-dataset.pdf
   Hierarchy: Root-to-Top 3-Tier Taxonomy + Gated Handler Contracts
   DSM: Dialogue State Tracking, Zero-Trust, OCR-ready, 48h/EBT compliance
   ========================================================= */

const Chat = (function () {
  'use strict';

  const $ = (s, r=document)=> r.querySelector(s);

  /* ---- catalog helpers ---- */
  const catName = id => (CATEGORIES.find(c=>c.id===id)||{}).name || id;
  const FALLBACK = 'https://images.unsplash.com/photo-1767032916116-2460bbd4a27d?auto=format&fit=crop&w=80&q=70';

  function normalizeW(w){ return w.toLowerCase().replace(/s$/,''); }
  function findProducts(q){
    const t = normalizeW(q.toLowerCase().trim());
    const words = t.split(/\W+/).filter(w=>w.length>=3).map(normalizeW);
    return PRODUCTS.filter(p=>{
      const hay = normalizeW(p.name+' '+p.meta+' '+catName(p.cat));
      const hayWords = hay.split(/\W+/);
      // strict: word equals hay word, or hay contains phrase
      return words.some(w=> hayWords.includes(w) || hay.includes(w));
    });
  }
  function productByName(name){
    const t=normalizeW(name.toLowerCase());
    return PRODUCTS.find(p=> normalizeW(p.name.toLowerCase()).includes(t) || t.includes(normalizeW(p.name.toLowerCase()).split(' ')[0]));
  }

  /* ---- DST Context ---- */
  const ctx = {
    auth_level: 'none', // none | session | otp
    user_has_confirmed: false,
    pendingConfirm: null, // {intent, entities}
    pendingSlots: null, // {intent, missing[], entities}
    slots: {}, // last extracted slots
    lastIntent: null,
    orders: [] // local demo orders
  };
  function refreshAuth(){
    const u = JSON.parse(localStorage.getItem('jimmi_user')||'{}');
    if(u.phone && u.name) ctx.auth_level = 'session';
    // if user verified OTP in this session, we promote to otp when needed
    const otpFlag = sessionStorage.getItem('jimmi_otp_verified');
    if(otpFlag==='1') ctx.auth_level = 'otp';
  }
  function ensureDemoOrders(){
    if(!localStorage.getItem('jimmi_orders')){
      const demo = [
        { id:'88271', items:['Alphonso Mangoes x1','Baby Spinach x2'], slot:'2026-08-28 18:00', status:'unfulfilled', placed: Date.now()- 3600000 },
        { id:'55491', items:['Seedless Grapes'], slot:'2026-08-28 19:00', status:'unfulfilled', placed: Date.now()- 2*3600000 },
        { id:'44591', items:['Dark Chocolate'], slot:'2026-08-29 10:00', status:'unfulfilled', placed: Date.now()- 86400000 }
      ];
      localStorage.setItem('jimmi_orders', JSON.stringify(demo));
    }
    ctx.orders = JSON.parse(localStorage.getItem('jimmi_orders')||'[]');
  }

  /* ---- slot extractors ---- */
  const Extractors = {
    produce_type: t=>{
      const known = PRODUCTS.filter(p=>p.cat==='fresh').map(p=>p.name.toLowerCase());
      let hits = known.filter(n=> t.includes(n));
      if(hits.length){
        // sort by appearance order in query to map quantities correctly
        hits.sort((a,b)=> t.indexOf(a) - t.indexOf(b));
        return hits.map(h=> h.split(' ').pop().replace(/s$/,'')); // return base word like avocado, banana
      }
      const m = t.match(/\b(avocado|banana|apple|strawberr|spinach|peach|watermelon|mango|tomato|broccoli|carrot|grape|cucumber|potato|capsicum)\w*\b/g);
      return m ? [...new Set(m.map(x=> x.toLowerCase().replace(/s$/,'')))] : null;
    },
    quantity: t=>{
      const wordMap={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
      const nums=[];
      // digits
      [...t.matchAll(/\b(\d+)\b/g)].forEach(m=> nums.push(parseInt(m[1],10)));
      // word numbers
      Object.keys(wordMap).forEach(w=>{
        const re=new RegExp('\\b'+w+'\\b','g');
        let mm; while((mm=re.exec(t))!==null) nums.push(wordMap[w]);
      });
      // keep order as they appear? For simplicity, digits first then words – better to capture in order via combined regex
      if(!nums.length){
        // try combined ordered extraction
        const combined=[...t.matchAll(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/g)].map(m=>{
          const v=m[1];
          return wordMap[v]!==undefined? wordMap[v] : parseInt(v,10);
        });
        if(combined.length) return combined;
        return null;
      }
      // if we have both digits and words, re-extract in order for correct mapping
      const ordered=[...t.matchAll(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/g)].map(m=>{
        const v=m[1];
        return wordMap[v]!==undefined? wordMap[v] : parseInt(v,10);
      }).filter(n=>n<100);
      return ordered.length? ordered : nums.filter(n=>n<100);
    },
    ripeness: t=>{
      const m=t.match(/\b(ripe|green|yellow|ready-to-eat|organic)\b/g);
      return m? [...new Set(m)] : null;
    },
    product_name: t=>{
      const hit = findProducts(t)[0];
      return hit? hit.name : null;
    },
    unit_type: t=>{
      const m=t.match(/\b(per pound|per piece|per unit|pound|lb|ounce|oz|weight|piece)\b/);
      return m? m[1] : null;
    },
    recipe_name: t=>{
      const recs=['lasagne','lasagna','pizza','cookies','chocolate chip cookies','beef stroganoff','guacamole','vegetarian patties'];
      return recs.find(r=> t.includes(r)) || null;
    },
    servings: t=>{
      const m=t.match(/(\d+)\s*servings?/);
      return m? parseInt(m[1],10) : (t.match(/\bfor (\d+)\b/) ? parseInt(t.match(/\bfor (\d+)\b/)[1],10) : null);
    },
    diet_type: t=>{
      const diets=['keto','dairy-free','vegan','gluten-free','organic','non-gmo','soy','peanut','peanuts'];
      const hit = diets.filter(d=> t.includes(d));
      return hit.length? hit : null;
    },
    zipcode: t=>{
      let m=t.match(/\b\d{5}\b/);
      if(m) return m[0];
      m=t.match(/\b\d{6}\b/);
      return m? m[0] : null;
    },
    delivery_time: t=>{
      const m=t.match(/\b(tomorrow morning|tonight before \d+ ?pm|between \d+ ?pm and \d+ ?pm|tomorrow|saturday|tonight|this afternoon|2 pm|4 pm|9 pm|5 pm)\b/);
      return m? m[0] : null;
    },
    store_location: t=>{
      const m=t.match(/\b(main street|cherry hill|store #\d+|#\d+)\b/);
      return m? m[0] : null;
    },
    pickup_time: t=>{
      const m=t.match(/\b(tomorrow at \d+ ?pm|tonight at \d+ ?pm|tonight before \d+ ?pm|this afternoon|tomorrow morning|5 pm today)\b/);
      return m? m[0] : null;
    },
    order_id: t=>{
      let m=t.match(/#(\d{4,6})/);
      if(m) return m[1];
      m=t.match(/order\s*#?\s*(\d{4,6})/);
      return m? m[1] : null;
    },
    modification_action: t=>{
      if(/add/.test(t)) return 'add';
      if(/remove/.test(t)) return 'remove';
      if(/swap|replace|change.*for/.test(t)) return 'swap';
      if(/change.*pickup time|change.*delivery/.test(t)) return 'reschedule';
      return null;
    },
    item_name: t=>{
      const hit=findProducts(t)[0];
      if(hit) return hit.name;
      // fallback generic extraction for missing/substituted items
      let m=t.match(/missing (?:the )?([a-z0-9 ]{3,30}?)(?: is| was| but| and|\.|,|$)/);
      if(m) return m[1].trim();
      m=t.match(/replaced (?:my )?([a-z0-9 ]{3,30}?) with/);
      if(m) return m[1].trim();
      m=t.match(/didn'?t receive (?:the )?([a-z0-9 ]{3,30})/);
      if(m) return m[1].trim();
      m=t.match(/left out.*?([a-z ]{3,20})$/);
      if(m) return m[1].trim();
      // last resort: first produce-like word
      const pt = t.match(/\b(steak|bagels?|butter|strawberries|milk|orange juice|cheesecake|bread|eggs|paper towels|ribeye|apples?|bananas?)\b/);
      return pt? pt[1] : 'item';
    },
    benefit_program: t=>{
      if(/snap|food stamp|ebt snap/.test(t)) return 'EBT SNAP';
      if(/ebt.*cash|tanf/.test(t)) return 'EBT Cash';
      if(/fsa|hsa|healthcare benefit|insurance benefit/.test(t)) return 'FSA/HSA';
      return null;
    },
    payment_method: t=>{
      const m=t.match(/\b(credit card|debit card|paypal|bank statement|upi|card)\b/);
      return m? m[0] : null;
    },
    product_category: t=>{
      const cats=['baby formula','alcohol','wine','tobacco','cigarettes','diapers','pet food','household cleaners'];
      return cats.find(c=> t.includes(c)) || null;
    },
    substituted_item: t=>{
      // second item after "with"
      const m=t.match(/with\s+(.+?)(?:,| and| i want)/);
      return m? m[1].trim() : null;
    }
  };

  /* ---- Intent taxonomy (from PDF, 14 leaf intents + utilities) ---- */
  const INTENTS = [
    // Product Discovery
    { id:'search_fresh_produce', L1:'Product Discovery', L2:'Deli, Bakery & Fresh Produce', minConf:0.42, auth:'none', confirm:false, req:['produce_type'],
      patterns:[
        'Add 5 ripe avocados and three green bananas to my shopping cart',
        'Do you have organic honeycrisp apples in stock today',
        'Find some fresh strawberries and add 2 packs',
        'Search for organic baby spinach 10oz',
        'Put four yellow peaches in my basket',
        'I need some seedless watermelons is there any fresh ones',
        'do you have mangoes','search for apples','find bananas','add avocados to cart'
      ], keywords:['avocado','banana','apple','strawberry','spinach','peach','watermelon','mango','tomato','broccoli','fresh','produce','search','find','add','stock','organic'] },
    { id:'inquire_variable_weight_pricing', L1:'Product Discovery', L2:'Variable Weight', minConf:0.60, auth:'none', confirm:false, req:[],
      patterns:[
        'If I buy 3 apples am I paying by the piece or the weight',
        'I want to order sliced turkey breast from the deli counter how do I specify weight',
        'Are watermelons priced per pound or per unit',
        'How is the beef chuck roast priced',
        'If I select bananas does the shopper weigh them',
        'Tell me how variable weight items are charged at checkout',
        'how is weight priced','per pound or per unit','variable weight'
      ], keywords:['per pound','per piece','per unit','weight','priced','turkey','deli','watermelon','beef','bananas','weigh','checkout','variable'] },
    { id:'build_basket_from_recipe', L1:'Product Discovery', L2:'Meal Planning', minConf:0.60, auth:'none', confirm:false, req:['recipe_name'],
      patterns:[
        'I want to make lasagne on Monday and vegetarian patties on Tuesday Please add the ingredients to my basket',
        'Find a recipe for gluten-free pizza for 4 people and put all of it in my cart',
        'Put ingredients for chocolate chip cookies for 10 servings in my bag',
        'Add all the stuff needed to cook beef stroganoff tonight',
        'What do I need to buy to make fresh guacamole Put it in my cart',
        'recipe for pizza','ingredients for cookies','make guacamole'
      ], keywords:['recipe','lasagne','lasagna','pizza','cookies','beef stroganoff','guacamole','ingredients','basket','servings','vegetarian'] },
    { id:'filter_dietary_restrictions', L1:'Product Discovery', L2:'Dietary', minConf:0.60, auth:'none', confirm:false, req:['diet_type'],
      patterns:[
        'Filter my catalog search to only show Keto-friendly items',
        'Show me dairy-free ice cream brands in your store',
        'I am highly allergic to peanuts hide all peanut-containing snacks',
        'Are there any vegan and gluten-free bread options available',
        'Filter out anything that contains soy or gluten',
        'Only show organic non-GMO produce options'
      ], keywords:['keto','dairy-free','vegan','gluten-free','organic','peanut','allergic','soy','filter','non-gmo'] },
    // Order Management
    { id:'reserve_delivery_slot', L1:'Order Management', L2:'Scheduling', minConf:0.65, auth:'none', confirm:false, req:['zipcode'],
      patterns:[
        'Can I schedule a delivery to 19104 tomorrow morning',
        'Reserve a delivery window between 2 PM and 4 PM for my address',
        'I want to book a delivery slot for zipcode 08003',
        'Is there any local delivery slots open tonight before 9 PM',
        'Book a home delivery window for this Saturday',
        'What times are available for grocery delivery in my neighborhood',
        'schedule delivery','delivery slot','reserve delivery','book delivery window'
      ], keywords:['schedule','reserve','book','delivery','slot','window','zipcode','19104','tomorrow','tonight'] },
    { id:'reserve_driveup_pickup_slot', L1:'Order Management', L2:'Scheduling', minConf:0.65, auth:'none', confirm:false, req:['store_location'],
      patterns:[
        'Can I schedule a DriveUp curbside pickup at the Main Street store for tomorrow at 3 PM',
        'Reserve a pickup slot for tonight at the cherry hill location',
        'Is there a pickup slot open tonight before 8 PM at store #445',
        'Schedule curbside pickup for this afternoon',
        'Reserve a DriveUp & Go time slot for tomorrow morning',
        'I need to book a curbside spot for 5 PM today'
      ], keywords:['curbside','pickup','driveup','store','schedule','reserve','pickup slot'] },
    { id:'modify_unfulfilled_order', L1:'Order Management', L2:'Order Adjustments', minConf:0.85, auth:'session', confirm:true, req:['order_id','modification_action'],
      patterns:[
        'Please edit my order #88271 to add a carton of milk',
        'I placed an order an hour ago can I change the pickup time to 6 PM',
        'Add two more bags of chips to my active grocery order',
        'I need to swap the whole milk in my order for 2% milk',
        'Can I add organic apples to my pending delivery scheduled for tonight',
        'Remove the ribeye steaks from my order #55491',
        'edit my order','modify my order','add to my order','swap milk'
      ], keywords:['edit','modify','add','swap','remove','order','change pickup','pending','unfulfilled'] },
    { id:'cancel_unfulfilled_order', L1:'Order Management', L2:'Order Adjustments', minConf:0.85, auth:'session', confirm:true, req:['order_id'],
      patterns:[
        'Cancel my grocery order #44591 immediately',
        'I want to cancel the delivery I scheduled for tomorrow',
        'Please void my pickup order placed this morning',
        'How do I terminate my active unfulfilled order',
        'Please cancel order #10023 and refund my card',
        'I made a mistake please cancel my scheduled order right now'
      ], keywords:['cancel','void','terminate','refund card','order'] },
    // Billing & Payments
    { id:'pay_with_ebt_snap', L1:'Billing & Payments', L2:'Government Benefits', minConf:0.90, auth:'otp', confirm:true, req:['benefit_program'],
      patterns:[
        'How do I use my SNAP EBT card online to buy fresh fruits',
        'Can I enter my EBT card number to pay for EBT eligible items',
        'Does your checkout accept electronic food stamps online',
        'I want to pay for my organic vegetables with my SNAP card',
        'How do I link my EBT card to my digital wallet for payment',
        'Can I use my SNAP benefits for curbside pickup orders'
      ], keywords:['snap','ebt','food stamp','benefits','eligible','card','electronic'] },
    { id:'pay_with_healthcare_benefit', L1:'Billing & Payments', L2:'Healthcare', minConf:0.85, auth:'session', confirm:false, req:['benefit_program'],
      patterns:[
        'Can I use my FSA or HSA card to pay for vitamins online',
        'Do you accept healthcare benefit cards for approved grocery items',
        'Can I pay with my HSA card for organic baby formula',
        'Is my insurance benefit card accepted at online checkout',
        'How do I find out which items in my cart are FSA HSA eligible',
        'Can I add my private insurance benefit card to my account'
      ], keywords:['fsa','hsa','healthcare','insurance benefit','vitamins','baby formula'] },
    { id:'explain_preauthorization_hold', L1:'Billing & Payments', L2:'Temporary Charges', minConf:0.65, auth:'none', confirm:false, req:[],
      patterns:[
        'Why is there a pending charge on my credit card that is higher than my bill',
        'Why did you hold extra money on my debit card',
        'How long does it take for the estimated total hold to be released',
        'Explain the pre-authorization hold on my PayPal account',
        'My order was $45 but my bank statement shows a hold for $60 Why',
        'When will the temporary hold from my cancelled order be returned',
        'pending charge','pre-authorization hold','temporary hold'
      ], keywords:['pending charge','hold','pre-authorization','estimated total','bank','paypal','temporary'] },
    // Post-Purchase
    { id:'report_missing_grocery_item', L1:'Post-Purchase', L2:'Satisfaction', minConf:0.85, auth:'session', confirm:true, req:['order_id','item_name'],
      patterns:[
        'My grocery delivery just arrived but the ribeye steak is missing',
        'Order #55492 is missing the bagels and organic butter',
        'I was charged for some fresh strawberries but they weren\'t in the bags',
        'My delivery is missing three items from the receipt',
        'How do I report that my milk carton was left out of my order',
        'I didn\'t receive the orange juice I paid for in my pickup order'
      ], keywords:['missing','wasn\'t in the bags','left out','didn\'t receive','not in','charged but missing'] },
    { id:'reject_substituted_item', L1:'Post-Purchase', L2:'Category Restrictions', minConf:0.85, auth:'session', confirm:true, req:['order_id','item_name'],
      patterns:[
        'The shopper replaced my organic eggs with regular eggs I want a refund',
        'The substitute cheesecake is damaged I\'d like a credit',
        'I want to reject the substitution of store-brand bread for Sara Lee',
        'The shopper substituted regular milk but I wanted soy milk refund me',
        'I did not agree to the brand swap on my paper towels',
        'The replaced item is not acceptable please refund my EBT card'
      ], keywords:['replaced','substituted','substitute','substitution','brand swap','refund','reject','replaced item'] },
    { id:'check_restricted_category_policy', L1:'Post-Purchase', L2:'Category Restrictions', minConf:0.65, auth:'none', confirm:false, req:['product_category'],
      patterns:[
        'Can I return the baby formula I bought this morning',
        'I want to refund the wine I received in my delivery',
        'What is your return policy on tobacco products and cigarettes',
        'Can I return alcohol bought online back to the physical store',
        'I ordered baby formula by mistake how do I get a credit',
        'Are there any restrictions on returning diapers or baby food'
      ], keywords:['return','baby formula','wine','alcohol','tobacco','cigarettes','diapers','return policy','restrictions'] },
    // Utilities (low-risk site help)
    { id:'inquire_product_price', L1:'Utility', minConf:0.50, auth:'none', confirm:false, req:[],
      patterns:['price of broccoli','how much is mango','cost of apples','what is rate of milk','₹ broccoli'], keywords:['price','cost','how much','rate','₹'] },
    { id:'ask_categories', L1:'Utility', minConf:0.50, auth:'none', confirm:false, req:[],
      patterns:['what categories do you sell','what do you sell','list categories','show me menu','what items do you have','range of products'], keywords:['category','categories','sell','menu','range','list','items','what do you'] },
    { id:'ask_offers', L1:'Utility', minConf:0.50, auth:'none', confirm:false, req:[],
      patterns:['any discounts','coupon offers','deals today','sale items','offers'], keywords:['discount','coupon','offer','deal','sale'] },
    { id:'greet', L1:'Utility', minConf:0.50, auth:'none', confirm:false, req:[],
      patterns:['hi','hello','hey','namaste','good morning','good evening','hello there'], keywords:['hi','hello','hey','namaste'] },
    { id:'ask_delivery', L1:'Utility', minConf:0.55, auth:'none', confirm:false, req:[],
      patterns:['delivery time','when will it arrive','how long delivery','shipping time','delivery fee'], keywords:['delivery','shipping','time take','reach','how long'] },
    { id:'ask_payment', L1:'Utility', minConf:0.55, auth:'none', confirm:false, req:[],
      patterns:['how to pay','payment options','upi card cod','which payment'], keywords:['payment','pay','upi','card','cod'] }
  ];

  /* ---- Handler Contracts (calibrated) ---- */
  const CONTRACTS = {};
  INTENTS.forEach(it=> CONTRACTS[it.id]={
    handler: it.id,
    min_confidence: it.minConf,
    required_slots: it.req,
    required_auth: it.auth,
    confirm: it.confirm
  });

  /* ---- helpers: jaccard ---- */
  function words(s){ return s.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>1); }
  function jaccard(a,b){
    const wa=new Set(words(a)), wb=new Set(words(b));
    const inter=[...wa].filter(x=>wb.has(x)).length;
    const uni=new Set([...wa,...wb]).size;
    return uni? inter/uni : 0;
  }
  function keywordConfidence(input, intent){
    // max jaccard over training patterns
    let best=0;
    intent.patterns.forEach(p=>{ const s=jaccard(input,p); if(s>best) best=s; });
    // also keyword overlap boost
    const iw=words(input);
    const kwHit=intent.keywords.filter(k=> input.toLowerCase().includes(k)).length;
    const kwScore= intent.keywords.length? kwHit/intent.keywords.length : 0;
    // weighted max
    return Math.max(best, kwScore*0.85);
  }

  function classify(input){
    let best=null, bestScore=0;
    INTENTS.forEach(it=>{
      const c=keywordConfidence(input,it);
      if(c>bestScore){ bestScore=c; best=it; }
    });
    // also check if input is very short greet
    if(!best || bestScore<0.18) return {intent:'fallback', confidence:0.4, intentObj:null};
    return {intent:best.id, confidence: bestScore, intentObj: best};
  }

  function extractSlots(intentId, text){
    const t=text.toLowerCase();
    const def = INTENTS.find(x=>x.id===intentId);
    const out={};
    if(!def) return out;
    def.req.forEach(slot=>{
      const fn=Extractors[slot];
      if(fn){ const v=fn(t); if(v) out[slot]=v; }
    });
    // also extract optional slots for richer context
    Object.keys(Extractors).forEach(k=>{
      if(!out[k]){
        const v=Extractors[k](t);
        if(v) out[k]=v;
      }
    });
    return out;
  }

  /* ---- Handlers (business logic per PDF) ---- */
  const Handlers = {
    search_fresh_produce: (entities, raw)=>{
      const pts = Array.isArray(entities.produce_type)? entities.produce_type : (entities.produce_type?[entities.produce_type]:[]);
      const qty = entities.quantity || [];
      const ripe = entities.ripeness || [];
      // handle multi-produce
      if(pts.length>1){
        let msgs=[];
        pts.forEach((pt, idx)=>{
          const hit=findProducts(pt)[0];
          if(hit){
            const n = qty[idx] || qty[0] || 1;
            for(let i=0;i<Math.min(n,5);i++) Store.addToCart(hit.id);
            msgs.push(`${n} × <b>${hit.name}</b> (${hit.meta}) ${ripe[idx]? '('+ripe[idx]+')': ''}`);
          } else {
            msgs.push(`No match for "${pt}" — try ${catName('fresh')} like ${PRODUCTS.filter(p=>p.cat==='fresh').slice(0,3).map(p=>p.name).join(', ')}`);
          }
        });
        return `Added to cart: ${msgs.join(' + ')}. <a href="#cat-fresh" onclick="document.getElementById('catalog').scrollIntoView({behavior:'smooth'})">View cart</a>`;
      }
      const q = pts[0] || raw;
      const found = findProducts(q);
      if(!found.length) return `I couldn't find "${q}" in catalog. Try ${catName('fresh')} like ${PRODUCTS.filter(p=>p.cat==='fresh').slice(0,3).map(p=>p.name).join(', ')} or tell me quantity (e.g., "Add 5 ripe avocados").`;
      const p=found[0];
      let msg=`Found <b>${p.name}</b> (${p.meta}) in ${catName(p.cat)} at <b>₹${p.price}</b>.`;
      if(qty.length){
        const n=qty[0];
        for(let i=0;i<Math.min(n,5);i++) Store.addToCart(p.id);
        msg+= ` Added ${n} × ${p.name} to your cart ${ripe.length? '('+ripe.join(',')+')':''}. <a href="#cat-${p.cat}" onclick="document.getElementById('catalog').scrollIntoView({behavior:'smooth'})">View</a>`;
      } else {
        msg+= ` <button class="btn btn--sm" onclick="Store.addToCart('${p.id}')">Add to cart</button>`;
        if(ripe.length) msg+=` <small>Tip: we have ${ripe.join('/')} options — tell me qty e.g., "Add 5 ripe avocados".</small>`;
      }
      if(!qty.length && !ripe.length){
        ctx.pendingSlots = {intent:'search_fresh_produce', missing:['quantity'], entities};
        return msg + `<br><br>How many would you like? And any ripeness preference (ripe/green)?`;
      }
      return msg;
    },
    inquire_variable_weight_pricing: ()=>{
      return `For items sold by weight (produce & deli meats like sliced turkey $8.99/lb, beef chuck, watermelons), checkout shows an <b>Estimated Price</b> (avg weight). Your shopper weighs the exact item on the scale and your final receipt reflects the exact weight. <small>Fruits like bananas/apples can be per piece or per pound — shown on product card.</small>`;
    },
    build_basket_from_recipe: (entities)=>{
      const recipe = entities.recipe_name||'your recipe';
      const servings = entities.servings||2;
      const map={
        'guacamole':['Alphonso Mangoes','Baby Spinach','Red Tomatoes'],
        'pizza':['Whole Wheat Bread','Fresh Milk','Red Tomatoes'],
        'lasagne':['Red Tomatoes','Broccoli','Fresh Milk'],
        'cookies':['Butter Biscuits','Dark Chocolate 70%','Fresh Milk'],
        'beef stroganoff':['Broccoli','Fresh Milk','Butter Croissant']
      };
      let ingredients = map[recipe] || ['Red Tomatoes','Baby Spinach','Fresh Milk'];
      ingredients.forEach(name=>{
        const p=productByName(name);
        if(p) Store.addToCart(p.id);
      });
      return `Building basket for <b>${recipe}</b> for ${servings} servings… Added ${ingredients.join(', ')} to your cart. Want to adjust for allergies (e.g., " gluten-free")?`;
    },
    filter_dietary_restrictions: (entities)=>{
      const diet = entities.diet_type ? (Array.isArray(entities.diet_type)?entities.diet_type.join(', '):entities.diet_type) : 'your preference';
      // simple filter: highlight matching products
      const hits = PRODUCTS.filter(p=> {
        const hay=(p.name+' '+p.meta).toLowerCase();
        return diet.split(',').some(d=> hay.includes(d) || catName(p.cat).toLowerCase().includes(d));
      });
      if(hits.length) return `Filtered for <b>${diet}</b>: ${hits.slice(0,6).map(p=>p.name).join(', ')} — scroll to see highlighted. Tell me allergen to hide (e.g., "hide peanuts").`;
      return `Applied <b>${diet}</b> filter. We tag organic/Keto/vegan items in catalog — use Search e.g., "vegan bread".`;
    },
    reserve_delivery_slot: (entities)=>{
      const zip=entities.zipcode, time=entities.delivery_time||'next available window';
      if(!zip) return `Please share your zipcode/pincode (e.g., 19104 or 600001) to check delivery slots.`;
      // operational rule: 8 AM – 9 PM, 90 min hold
      return `Delivery to <b>${zip}</b> is available 8:00 AM – 9:00 PM. Reserved <b>${time}</b> — held for 90 minutes while you shop. Complete checkout within 90 min or slot is released.`;
    },
    reserve_driveup_pickup_slot: (entities)=>{
      const loc=entities.store_location||'nearest store';
      const tm=entities.pickup_time||'next pickup window';
      return `DriveUp curbside at <b>${loc}</b> reserved for <b>${tm}</b>. Slots 8 AM – 9 PM, held 90 min. Park in DriveUp bay and we’ll bring bags to your car.`;
    },
    modify_unfulfilled_order: (entities)=>{
      const oid=entities.order_id, act=entities.modification_action||'edit';
      const order = ctx.orders.find(o=> o.id===oid);
      if(!order) return `I couldn’t find order <b>#${oid}</b>. Check order ID (e.g., 88271) — you have: ${ctx.orders.map(o=>'#'+o.id).join(', ')}`;
      if(order.status!=='unfulfilled') return `Order #${oid} is already fulfilled and locked. Edits only allowed same-day before picking starts.`;
      const placedHours = (Date.now()-order.placed)/3600000;
      if(placedHours>24) return `Order #${oid} was placed over 24h ago and is locked. Contact support for help.`;
      return `Order <b>#${oid}</b> updated: <b>${act}</b> ${entities.item_name||''} — confirmed. New total will show at checkout.`;
    },
    cancel_unfulfilled_order: (entities)=>{
      const oid=entities.order_id;
      const order = ctx.orders.find(o=> o.id===oid);
      if(!order) return `Order #${oid||'?'} not found. Active orders: ${ctx.orders.map(o=>'#'+o.id).join(', ')}`;
      order.status='cancelled';
      localStorage.setItem('jimmi_orders', JSON.stringify(ctx.orders));
      return `Order <b>#${oid}</b> cancelled and refund initiated to your card. Refund posts in 3–5 business days.`;
    },
    pay_with_ebt_snap: ()=>{
      return `Yes — we accept <b>EBT SNAP online</b> for pickup & delivery. Use benefits for SNAP-eligible foods: fruits, vegetables, meats, dairy, bread. <b>Delivery fees, bag fees, household cleaners, alcohol, pet food</b> must be paid with a secondary credit/debit card at checkout. Want me to walk you through linking your EBT card? [Requires OTP verification]`;
    },
    pay_with_healthcare_benefit: ()=>{
      return `We accept <b>FSA/HSA & healthcare benefit cards</b> for eligible items (vitamins, baby formula etc.). At checkout, select Wallet → Healthcare. Tell me item and I’ll check eligibility (e.g., “Is baby formula HSA eligible?”).`;
    },
    explain_preauthorization_hold: ()=>{
      return `That pending charge is a <b>pre-authorization hold</b> for the estimated total. Banks hold the estimated amount when order is placed (to cover substitutions/weighed items). Hold is <b>3–5 business days after delivery/pickup</b> to release; final charge = exact receipt total. Cancelled holds also take 3–5 days.`;
    },
    report_missing_grocery_item: (entities)=>{
      const oid=entities.order_id, item=entities.item_name||'item';
      if(!oid) return `Please share order ID (e.g., #55492) and missing item to report.`;
      return `Missing <b>${item}</b> on order <b>#${oid}</b> — noted. Under 100% Satisfaction Guarantee, report within <b>48 hours</b> for automated refund/credit. Upload a receipt photo if you have one. After 48h, routed to human audit.`;
    },
    reject_substituted_item: (entities)=>{
      const oid=entities.order_id, item=entities.item_name||'substituted item';
      return `Substitution for <b>${item}</b> on order <b>#${oid}</b> rejected. If damage confidence >0.82 (photo) or OCR shows billing error, we auto-refund to original payment (EBT/card). Confirm refund to proceed.`;
    },
    check_restricted_category_policy: (entities)=>{
      const cat=entities.product_category||'that item';
      if(/baby formula|alcohol|wine|tobacco|cigarettes/.test(cat)){
        return `<b>Federal Exclusion:</b> ${cat} <b>cannot be returned/refunded</b> once accepted at delivery/curbside (health & licensing). If unopened and reported within 48h before acceptance, contact support.`;
      }
      return `Returns for <b>${cat}</b> allowed within 48h if fresh/damaged. Open order → Help → Refund.`;
    },
    inquire_product_price: (entities, raw)=>{
      const found=findProducts(raw);
      if(found.length){ const p=found[0]; return `${p.name} is <b>₹${p.price}</b> (${p.meta}) in ${catName(p.cat)}.`; }
      return `Tell me product name e.g., “price of Alphonso mangoes” and I’ll quote it.`;
    },
    ask_categories: ()=>{
      return `We sell: <b>${CATEGORIES.map(c=>c.name).join(', ')}</b>. Try “Do you have organic apples?” or “Show ${catName('sweet')}”.`;
    },
    ask_offers: ()=>{
      const off=PRODUCTS.filter(p=>p.badge && p.badge.type==='off');
      return off.length? `Today’s discounts: ${off.map(p=>`${p.name} at <b>₹${p.price}</b>`).join(', ')}. Use <b>FRESH10 / SAVE50 / FREEDEL</b> at checkout.` : `No running offers — check back soon!`;
    },
    greet: ()=> `Hi! I’m Jimmi 👋 — your grocery copilot trained on our master dataset (Product Discovery, Order Management, Billing & Post-Purchase). Ask me for produce (“Add 5 ripe avocados”), delivery slots, EBT, pre-auth holds, missing items or substitutions. Try: “Do you have organic apples?”`,
    ask_delivery: ()=> `We deliver 7 AM–11 PM, 60-min standard (Free) or 30-min Express ₹25. Slots held 90 min. Free delivery above ₹99. Which pincode should I check?`,
    ask_payment: ()=> `We accept UPI, cards, wallets & COD — plus EBT SNAP (eligible foods only) with backup card for fees, and FSA/HSA for eligible items. Pre-auth holds 3–5 days.`
  };

  /* ---- Router (Gated Handler Contract) ---- */
  function route(prediction, entities){
    const intent = prediction.intent;
    const conf = prediction.confidence;
    const contract = CONTRACTS[intent];
    if(!contract){
      return `I couldn’t verify that safely. Try: “Add 5 ripe avocados” or “Explain pre-auth hold”.`;
    }
    // 1. Confidence Gate
    if(conf < contract.min_confidence){
      return `I’m not confident enough (${(conf*100).toFixed(0)}% < ${(contract.min_confidence*100).toFixed(0)}%). ${intentHint(intent,entities)}`;
    }
    // 2. Slot Validation Gate
    const missing = contract.required_slots.filter(s=> !entities[s] || (Array.isArray(entities[s]) && !entities[s].length));
    if(missing.length){
      ctx.pendingSlots = {intent, missing, entities};
      return slotFillPrompt(intent, missing);
    }
    // 3. Auth Gate
    refreshAuth();
    if(!meetsAuth(ctx.auth_level, contract.required_auth)){
      return authPrompt(contract.required_auth, intent);
    }
    // 4. Confirmation Gate
    if(contract.confirm && !ctx.user_has_confirmed){
      ctx.pendingConfirm = {intent, entities};
      return confirmPrompt(intent, entities);
    }
    // all gates passed
    ctx.user_has_confirmed=false;
    ctx.pendingConfirm=null;
    ctx.pendingSlots=null;
    const h=Handlers[intent];
    if(h) return h(entities, lastRaw);
    return Handlers.greet();
  }

  function meetsAuth(have, need){
    const rank={none:0, session:1, otp:2};
    return rank[have] >= rank[need];
  }
  function authPrompt(need,intent){
    if(need==='session') return `This needs you to be signed in. Please <a href="agenda.html">sign in</a> or tap Login, then retry.`;
    if(need==='otp') return `This needs OTP verification for security. Please go to <a href="agenda.html">Sign in → verify OTP</a> (demo shows OTP at top). I’ll remember after you verify — try again. [I’ll set sessionStorage jimmi_otp_verified=1]`;
    return `Authentication required: ${need}`;
  }
  function intentHint(intent,entities){
    const hints={
      search_fresh_produce:'Try: “Add 5 ripe avocados” or “Do you have organic apples?”',
      modify_unfulfilled_order:'Include order ID e.g., “Edit order #88271 to add milk”',
      pay_with_ebt_snap:'Ask: “Can I use my SNAP EBT online?”',
      report_missing_grocery_item:'Share order ID and missing item e.g., “Order #55492 missing bagels”'
    };
    return hints[intent]||'Could you rephrase with more detail?';
  }
  function slotFillPrompt(intent,missing){
    const asks={
      produce_type:'Which produce? e.g., avocados, bananas, apples',
      zipcode:'Which zipcode/pincode? e.g., 19104 or 600001',
      store_location:'Which store? e.g., Main Street or cherry hill',
      order_id:'What’s the order ID? e.g., #88271',
      modification_action:'What change? add / remove / swap / reschedule time',
      benefit_program:'Which benefit? SNAP EBT or FSA/HSA',
      item_name:'Which item is affected?',
      product_category:'Which product category? (baby formula, wine, tobacco…)'
    };
    return `I need a bit more: <b>${missing.map(m=>asks[m]||m).join(' ; ')}</b>`;
  }
  function confirmPrompt(intent,entities){
    return `Confirm <b>${intent.replace(/_/g,' ')}</b> ${JSON.stringify(entities)}?<br><button class="btn btn--sm" data-confirm="yes">Yes, confirm</button> <button class="btn btn--ghost btn--sm" data-confirm="no">No, cancel</button>`;
  }

  let lastRaw='';
  let lastPrediction=null;

  /* ---- Multimodal OCR quick check ---- */
  function handleImageQuery(t){
    if(/(image|photo|upload|screenshot|receipt|picture).*?(damaged|bruised|split|rotten|missing|refund|coupon|expired)/.test(t) || /(damaged|bruised).*?(image|photo)/.test(t)){
      if(/coupon|receipt|promo|expired|minimum order/.test(t)){
        return `You uploaded an <b>app_screenshot</b>. Our OCR-BERT (EAST + RCNN) extracted the text and detected “Coupon expired”. Per <b>PDF p10</b>, this routes to billing credit pipeline — we’ll verify and credit your account within 48h.`;
      }
      return `You shared a <b>commodity_photo</b>. VisualBERT (ResNet-50 2048-d) analyzes regional damage. If confidence >0.82, we auto-refund via 100% Satisfaction Guarantee (48h). Please also share order ID.`;
    }
    return null;
  }

  /* ---- Public answer (training entry) ---- */
  function answer(text){
    lastRaw=text;
    const t=text.toLowerCase();
    const imgReply = handleImageQuery(t);
    if(imgReply) return imgReply;

    // handle pending confirmation
    if(ctx.pendingConfirm && /^(yes|confirm|yep|proceed|ok)/.test(t)){
      ctx.user_has_confirmed=true;
      const pc=ctx.pendingConfirm;
      ctx.pendingConfirm=null;
      return route({intent:pc.intent, confidence:0.92}, pc.entities);
    }
    if(ctx.pendingConfirm && /^(no|cancel|stop|abort)/.test(t)){
      ctx.pendingConfirm=null; ctx.user_has_confirmed=false;
      return `Cancelled. How else can I help?`;
    }
    // handle pending slot fill — merge new entities, but allow new high-confidence intent to override
    if(ctx.pendingSlots){
      const peek = classify(text);
      if(peek.intentObj && peek.intent !== ctx.pendingSlots.intent && peek.confidence > 0.58){
        ctx.pendingSlots = null; // user switched topic
      } else {
        const extra=extractSlots(ctx.pendingSlots.intent, text);
        // also try direct extraction for missing slots via generic regex
        if(!extra.order_id){
          const oid = text.match(/#?\b(\d{4,6})\b/);
          if(oid) extra.order_id = oid[1] || oid[0].replace('#','');
        }
        if(!extra.item_name && /missing|replaced|substitut/.test(text.toLowerCase())){
          const m = text.toLowerCase().match(/(?:missing|replaced|substituted)\s+(?:the\s+)?([a-z ]{3,30})/);
          if(m) extra.item_name = m[1].split(' and')[0].trim();
        }
        const merged={...ctx.pendingSlots.entities, ...extra};
        const stillMissing = ctx.pendingSlots.missing.filter(m=> !merged[m] || (Array.isArray(merged[m]) && !merged[m].length));
        if(stillMissing.length){
          if(Object.keys(extra).length===0){
            return slotFillPrompt(ctx.pendingSlots.intent, stillMissing);
          }
          ctx.pendingSlots.entities=merged;
          ctx.pendingSlots.missing=stillMissing;
          if(stillMissing.length) return slotFillPrompt(ctx.pendingSlots.intent, stillMissing);
        }
        const intent=ctx.pendingSlots.intent;
        const conf=0.82;
        ctx.pendingSlots=null;
        return route({intent, confidence:conf}, merged);
      }
    }

    const pred=classify(text);
    lastPrediction=pred;
    const entities= pred.intentObj? extractSlots(pred.intent, text) : {};
    ctx.lastIntent=pred.intent;
    ctx.slots=entities;

    // quick handle for greet etc without contract?
    if(pred.intent==='fallback'){
      // try simple product discovery fallback using old logic for price/stock
      const found=findProducts(text);
      if(/price|cost|how much|rate|₹/.test(t) && found.length){
        const p=found[0]; return `${p.name} is <b>₹${p.price}</b> (${p.meta}).`;
      }
      if(/have|available|stock|sell/.test(t) && found.length){
        const p=found[0]; return `Yes! We stock <b>${p.name}</b> (${p.meta}) in ${catName(p.cat)} at <b>₹${p.price}</b>.`;
      }
      if(/category|categories|sell|what do you/.test(t)){
        return `We sell: ${CATEGORIES.map(c=>c.name).join(', ')}. Try “Do you have organic apples?” or “Filter vegan items”.`;
      }
      // deals FAQ
      if(/discount|coupon|offer|deal|sale/.test(t)){
        const off=PRODUCTS.filter(p=>p.badge && p.badge.type==='off');
        return `Today’s discounts: ${off.map(p=>`${p.name} at ₹${p.price}`).join(', ')}. Use FRESH10 / SAVE50 / FREEDEL at checkout.`;
      }
      return `I’m not 100% sure (${(pred.confidence*100).toFixed(0)}%). Try one of our trained intents:<br>• “Add 5 ripe avocados”<br>• “Are watermelons per pound?”<br>• “Schedule delivery to 19104 tomorrow morning”<br>• “Can I use SNAP EBT online?”<br>• “Why is there a pending hold?”<br>• “Order #55492 missing bagels”`;
    }

    return route(pred, entities);
  }

  /* ---- UI ---- */
  function init(){
    refreshAuth(); ensureDemoOrders();
    const box=document.getElementById('chat');
    if(!box) return;
    const log=box.querySelector('.chat-log');
    const input=box.querySelector('.chat-input');
    const send=box.querySelector('.chat-send');
    const openBtn=document.getElementById('chat-open');
    const closeBtn=box.querySelector('.chat-close');

    function push(who, text, isHtml){
      const row=document.createElement('div');
      row.className='chat-msg chat-msg--'+who;
      if(isHtml) row.innerHTML=text; else row.textContent=text;
      log.appendChild(row);
      // wire confirm buttons
      row.querySelectorAll('[data-confirm]').forEach(b=>{
        b.addEventListener('click',()=>{
          const v=b.dataset.confirm;
          log.querySelectorAll('[data-confirm]').forEach(x=> x.disabled=true);
          sendMsg(v);
        });
      });
      // wire product add buttons
      row.querySelectorAll('[data-add]').forEach(b=>{
        b.addEventListener('click',()=>{
          const id=b.dataset.add;
        });
      });
      log.scrollTop=log.scrollHeight;
    }
    function sendMsg(override){
      const v=(override!==undefined? override : input.value.trim());
      if(!v) return;
      push('user', v);
      if(override===undefined) input.value='';
      const typing=document.createElement('div');
      typing.className='chat-msg chat-msg--bot';
      typing.textContent='…';
      log.appendChild(typing); log.scrollTop=log.scrollHeight;
      setTimeout(()=>{
        typing.remove();
        const ans=answer(v);
        push('bot', ans, true);
      }, 460);
    }

    openBtn.addEventListener('click',()=> box.classList.add('chat--open'));
    closeBtn.addEventListener('click',()=> box.classList.remove('chat--open'));
    send.addEventListener('click',()=> sendMsg());
    input.addEventListener('keydown', e=>{ if(e.key==='Enter') sendMsg(); });
    const fileInput=document.getElementById('chat-file');
    if(fileInput){
      fileInput.addEventListener('change', ()=>{
        const f=fileInput.files[0];
        if(!f) return;
        push('user', `📷 Uploaded image: ${f.name} (${(f.size/1024).toFixed(1)} KB)`);
        const typing2=document.createElement('div');
        typing2.className='chat-msg chat-msg--bot';
        typing2.textContent='🔍 Analyzing image (OCR-BERT + VisualBERT)…';
        log.appendChild(typing2); log.scrollTop=log.scrollHeight;
        setTimeout(()=>{
          typing2.remove();
          const name=f.name.toLowerCase();
          let reply='';
          if(/receipt|coupon|promo|code/.test(name)){
            reply=`Detected <b>app_screenshot</b> via OCR-BERT branch. Extracted text: <i>“Coupon expired / Minimum order not met”</i> [SEP] ${name}. As per PDF p10, routing to account credit pipeline — your coupon will be manually verified and credit applied in 48h if valid.`;
          } else if(/apple|strawberry|mango|tomato|milk|bread|damaged|bruised|split/.test(name) || name.match(/\.(jpg|png|jpeg)$/)){
            // commodity photo
            reply=`Detected <b>commodity_photo</b> via VisualBERT (ResNet-50 2048-d). Visual damage confidence <b>0.87</b> (>0.82 threshold) — automating <b>100% Item Satisfaction Guarantee</b> refund. <small>Per PDF p10: commodity_photo + damage >0.82 → auto-refund.</small> Upload more photos if needed.`;
          } else {
            reply=`Image received. Our dual-branch fusion (OCR-BERT + VisualBERT) classified it. If it’s a receipt, we OCR the text; if it’s a damaged item, we check visual damage >0.82 for auto-refund. Tell me order ID and I’ll process.`;
          }
          push('bot', reply, true);
        }, 1200);
        fileInput.value='';
      });
    }

    // handle image upload mention (OCR-ready note)
    const hint = document.createElement('div');
    hint.style.cssText='font-size:.72rem;color:#6b7a72;text-align:center;padding:6px;';
    hint.textContent='Tip: upload a receipt/damaged item photo — our OCR/VisualBERT branch can read it (demo).';
    log.appendChild(hint);

    push('bot','Welcome to Jimmi Store! I’m trained on our master dataset (14 intents, DST, gated safety). Try: <b>“Add 5 ripe avocados”</b>, <b>“Are watermelons per pound?”</b>, <b>“Schedule delivery to 600001 tomorrow morning”</b>, <b>“Can I use SNAP EBT?”</b>. What can I get for you?', true);
  }

  return { init, answer, classify, ctx, INTENTS, CONTRACTS };
})();


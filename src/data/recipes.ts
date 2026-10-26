export type IngredientKind = 'tomato' | 'lemon' | 'carrot' | 'mushroom' | 'onion' | 'chili' | 'garlic' | 'herb' | 'eggplant' | 'lime';
export type Region = 'Asia' | 'Europe' | 'Africa' | 'Americas' | 'Middle East';

export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  kind: IngredientKind;
}
export interface RecipeStep {
  title: string;
  instruction: string;
  minutes: number;
  tip: string;
}
export interface Recipe {
  id: string;
  name: string;
  subtitle: string;
  country: string;
  region: Region;
  minutes: number;
  difficulty: 'Easy' | 'Medium' | 'A little project';
  servings: number;
  image: string;
  accent: string;
  tags: string[];
  story: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
}
export const regions = ['All', 'Asia', 'Europe', 'Africa', 'Americas', 'Middle East'] as const;

export const recipes: Recipe[] = [
  {
    id: 'miso-ramen', name: 'Miso mushroom ramen', subtitle: 'A bowl of pure comfort',
    country: 'Japan', region: 'Asia', minutes: 35, difficulty: 'Medium', servings: 2,
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1200&q=85',
    accent: '#d8e6b7', tags: ['Umami', 'Noodles', 'Comfort'],
    story: 'Inspired by the soul-warming noodle shops of Japan. Deeply savory miso broth, silky noodles and golden mushrooms meet in one generous bowl.',
    ingredients: [
      { id: 'mushrooms', name: 'Mixed mushrooms', amount: 200, unit: 'g', kind: 'mushroom' },
      { id: 'miso', name: 'White miso paste', amount: 2, unit: 'tbsp', kind: 'garlic' },
      { id: 'noodles', name: 'Ramen noodles', amount: 180, unit: 'g', kind: 'herb' },
      { id: 'stock', name: 'Vegetable stock', amount: 700, unit: 'ml', kind: 'onion' },
      { id: 'garlic', name: 'Garlic cloves', amount: 2, unit: 'cloves', kind: 'garlic' },
      { id: 'spring-onion', name: 'Spring onions', amount: 2, unit: 'stalks', kind: 'herb' },
      { id: 'sesame', name: 'Toasted sesame oil', amount: 1, unit: 'tbsp', kind: 'lime' }
    ],
    steps: [
      { title: 'Get everything ready', instruction: 'Clean and slice the mushrooms. Finely chop the garlic and spring onions. Bring a separate pot of water to a boil for the noodles.', minutes: 5, tip: 'Keep the green spring onion tops for garnish.' },
      { title: 'Sear the mushrooms', instruction: 'Heat sesame oil in a deep pot over medium-high heat. Sauté the mushrooms in a single layer until browned, about 5–6 minutes.', minutes: 6, tip: 'Avoid stirring too early; the golden edges build flavor.' },
      { title: 'Build the broth', instruction: 'Add garlic and cook for 30 seconds. Pour in the stock, bring to a gentle simmer and cook for 8 minutes.', minutes: 8, tip: 'Keep the broth below a rolling boil for a clear, balanced flavor.' },
      { title: 'Stir in the miso', instruction: 'Ladle some warm broth into a bowl and whisk with miso until smooth. Return it to the pot off the heat.', minutes: 3, tip: 'Do not boil miso after adding it; its aroma is delicate.' },
      { title: 'Cook the noodles', instruction: 'Boil ramen noodles according to their package, usually 3–4 minutes. Drain well and divide between two bowls.', minutes: 4, tip: 'Cook noodles separately to prevent a starchy broth.' },
      { title: 'Finish and serve', instruction: 'Pour hot broth and mushrooms over the noodles. Finish with spring onions and a few drops of sesame oil.', minutes: 2, tip: 'Serve immediately while the noodles are springy.' }
    ]
  },
  {
    id: 'pomodoro', name: 'Slow Sunday pomodoro', subtitle: 'Simple things, done beautifully',
    country: 'Italy', region: 'Europe', minutes: 40, difficulty: 'Easy', servings: 2,
    image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1200&q=85',
    accent: '#f5c5aa', tags: ['Pasta', 'Vegetarian', 'Classic'],
    story: 'A celebration of the Italian kitchen: ripe tomatoes, fragrant basil and pasta water turned into a glossy, comforting sauce.',
    ingredients: [
      { id: 'tomatoes', name: 'Ripe tomatoes', amount: 500, unit: 'g', kind: 'tomato' },
      { id: 'pasta', name: 'Spaghetti', amount: 200, unit: 'g', kind: 'herb' },
      { id: 'garlic', name: 'Garlic cloves', amount: 3, unit: 'cloves', kind: 'garlic' },
      { id: 'oil', name: 'Extra virgin olive oil', amount: 3, unit: 'tbsp', kind: 'lemon' },
      { id: 'basil', name: 'Fresh basil', amount: 12, unit: 'leaves', kind: 'herb' },
      { id: 'salt', name: 'Sea salt', amount: 1, unit: 'tsp', kind: 'onion' },
      { id: 'parmesan', name: 'Parmesan (optional)', amount: 30, unit: 'g', kind: 'mushroom' }
    ],
    steps: [
      { title: 'Prep the tomatoes', instruction: 'Dice ripe tomatoes and gently crush with your hands or the back of a spoon. Peel and thinly slice the garlic.', minutes: 7, tip: 'Use the ripest tomatoes you can find.' },
      { title: 'Infuse the oil', instruction: 'Warm olive oil in a wide pan over low heat. Add garlic and cook until fragrant and barely golden, about 2 minutes.', minutes: 3, tip: 'Golden, not brown: burned garlic tastes bitter.' },
      { title: 'Simmer the sauce', instruction: 'Add tomatoes and a pinch of salt. Simmer uncovered for 18–20 minutes, stirring occasionally, until thick and sweet.', minutes: 20, tip: 'A wide pan helps the sauce reduce evenly.' },
      { title: 'Boil the pasta', instruction: 'Cook spaghetti in generously salted boiling water until one minute shy of al dente. Reserve a cup of pasta water.', minutes: 9, tip: 'The pasta water is the secret to a silky finish.' },
      { title: 'Bring it together', instruction: 'Transfer spaghetti to the sauce. Add a splash of pasta water and toss vigorously over medium heat until glossy.', minutes: 2, tip: 'Add water a little at a time, not all at once.' },
      { title: 'Finish with basil', instruction: 'Tear basil over the pasta. Serve with parmesan if using and another thread of olive oil.', minutes: 1, tip: 'Tear basil by hand to preserve its fragrance.' }
    ]
  },
  {
    id: 'chakalaka', name: 'Rainbow chakalaka', subtitle: 'A little heat, a lot of heart',
    country: 'South Africa', region: 'Africa', minutes: 35, difficulty: 'Easy', servings: 2,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=85',
    accent: '#f0b879', tags: ['Spiced', 'Plant-based', 'Colorful'],
    story: 'A vibrant South African vegetable relish with a warm kick. Serve it with pap, bread or alongside a braai.',
    ingredients: [
      { id: 'onion', name: 'Onion', amount: 1, unit: 'whole', kind: 'onion' },
      { id: 'carrot', name: 'Carrots', amount: 2, unit: 'whole', kind: 'carrot' },
      { id: 'pepper', name: 'Bell pepper', amount: 1, unit: 'whole', kind: 'tomato' },
      { id: 'chili', name: 'Fresh chili', amount: 1, unit: 'whole', kind: 'chili' },
      { id: 'tomatoes', name: 'Chopped tomatoes', amount: 250, unit: 'g', kind: 'tomato' },
      { id: 'beans', name: 'Baked beans', amount: 200, unit: 'g', kind: 'mushroom' },
      { id: 'curry', name: 'Mild curry powder', amount: 2, unit: 'tsp', kind: 'garlic' },
      { id: 'oil', name: 'Vegetable oil', amount: 2, unit: 'tbsp', kind: 'lemon' }
    ],
    steps: [
      { title: 'Chop the vegetables', instruction: 'Finely chop the onion and chili, grate the carrots and dice the bell pepper. Keep each in a separate pile.', minutes: 8, tip: 'Remove chili seeds for a milder relish.' },
      { title: 'Soften the aromatics', instruction: 'Heat oil in a saucepan over medium heat. Sauté onion until translucent, then add chili and curry powder for 30 seconds.', minutes: 6, tip: 'Blooming the spice in oil releases its aroma.' },
      { title: 'Add crunch and color', instruction: 'Stir in carrots and bell pepper. Cook for 5 minutes, stirring, until they begin to soften.', minutes: 5, tip: 'Leave a little texture in the vegetables.' },
      { title: 'Simmer with tomatoes', instruction: 'Add chopped tomatoes, reduce heat and simmer for 8–10 minutes until the mixture becomes saucy.', minutes: 10, tip: 'Add a splash of water if the pan looks dry.' },
      { title: 'Fold in the beans', instruction: 'Gently stir in the baked beans and heat through for 3 minutes. Taste and adjust salt and heat.', minutes: 3, tip: 'Avoid breaking up the beans.' },
      { title: 'Let the flavors settle', instruction: 'Rest for a few minutes and serve warm or at room temperature with pap or bread.', minutes: 3, tip: 'Chakalaka is often even better the next day.' }
    ]
  },
  {
    id: 'butter-chicken', name: 'Golden butter chicken', subtitle: 'Velvety, warming, unforgettable',
    country: 'India', region: 'Asia', minutes: 55, difficulty: 'A little project', servings: 2,
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=1200&q=85',
    accent: '#f0c16e', tags: ['Curry', 'Comfort', 'Spiced'],
    story: 'Inspired by North Indian makhani-style cooking: gently spiced chicken folded into a buttery tomato and cream sauce.',
    ingredients: [
      { id: 'chicken', name: 'Boneless chicken pieces', amount: 350, unit: 'g', kind: 'mushroom' },
      { id: 'yogurt', name: 'Plain yogurt', amount: 100, unit: 'g', kind: 'lemon' },
      { id: 'tomato', name: 'Tomato purée', amount: 250, unit: 'g', kind: 'tomato' },
      { id: 'onion', name: 'Onion', amount: 1, unit: 'whole', kind: 'onion' },
      { id: 'garlic', name: 'Garlic cloves', amount: 3, unit: 'cloves', kind: 'garlic' },
      { id: 'spice', name: 'Garam masala', amount: 2, unit: 'tsp', kind: 'chili' },
      { id: 'butter', name: 'Butter', amount: 35, unit: 'g', kind: 'carrot' },
      { id: 'cream', name: 'Cooking cream', amount: 80, unit: 'ml', kind: 'herb' }
    ],
    steps: [
      { title: 'Marinate the chicken', instruction: 'Coat chicken in yogurt and half the garam masala. Cover and refrigerate for at least 15 minutes while you prep the sauce.', minutes: 15, tip: 'Marinating longer in the refrigerator deepens flavor.' },
      { title: 'Brown the chicken', instruction: 'Sear chicken in a hot, lightly oiled pan in batches until browned. Set aside; it will finish cooking in the sauce.', minutes: 7, tip: 'Do not crowd the pan.' },
      { title: 'Make the aromatic base', instruction: 'Melt butter over medium heat. Cook diced onion until soft, then add minced garlic and remaining garam masala.', minutes: 8, tip: 'Stir spices constantly so they do not burn.' },
      { title: 'Simmer the sauce', instruction: 'Add tomato purée and a splash of water. Simmer for 10 minutes until thickened, then blend carefully if you prefer a smooth sauce.', minutes: 10, tip: 'A gentle simmer prevents splattering.' },
      { title: 'Finish cooking the chicken', instruction: 'Return chicken and its juices to the sauce. Simmer until cooked through to 74°C / 165°F at the thickest point.', minutes: 10, tip: 'Use a food thermometer; time alone cannot confirm safety.' },
      { title: 'Make it silky', instruction: 'Lower heat, stir in cream and taste for salt. Serve with rice or warm naan.', minutes: 5, tip: 'Add cream off the boil for a velvety texture.' }
    ]
  },
  {
    id: 'tacos', name: 'Street-style mushroom tacos', subtitle: 'Bright bites, big energy',
    country: 'Mexico', region: 'Americas', minutes: 30, difficulty: 'Easy', servings: 2,
    image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=1200&q=85',
    accent: '#f6d76f', tags: ['Street food', 'Vegetarian', 'Zesty'],
    story: 'A plant-forward take on Mexican street-style tacos: smoky mushrooms, sharp lime and quick-pickled onion in warm tortillas.',
    ingredients: [
      { id: 'mushroom', name: 'Oyster or button mushrooms', amount: 250, unit: 'g', kind: 'mushroom' },
      { id: 'tortillas', name: 'Small corn tortillas', amount: 6, unit: 'pieces', kind: 'carrot' },
      { id: 'lime', name: 'Limes', amount: 2, unit: 'whole', kind: 'lime' },
      { id: 'onion', name: 'Red onion', amount: 1, unit: 'whole', kind: 'onion' },
      { id: 'chili', name: 'Chili powder', amount: 1, unit: 'tsp', kind: 'chili' },
      { id: 'paprika', name: 'Smoked paprika', amount: 1, unit: 'tsp', kind: 'tomato' },
      { id: 'cilantro', name: 'Fresh coriander', amount: 15, unit: 'g', kind: 'herb' }
    ],
    steps: [
      { title: 'Quick-pickle the onion', instruction: 'Thinly slice red onion and toss with the juice of one lime and a pinch of salt. Leave to soften.', minutes: 8, tip: 'A little sugar balances very sharp limes.' },
      { title: 'Prepare the mushrooms', instruction: 'Tear mushrooms into bite-sized pieces. Toss with chili powder, smoked paprika, salt and a drizzle of oil.', minutes: 5, tip: 'Torn edges crisp more beautifully than neat slices.' },
      { title: 'Sear until golden', instruction: 'Heat a heavy pan until hot. Cook mushrooms in batches until deeply browned, about 7–8 minutes.', minutes: 8, tip: 'Let the pan stay hot; mushrooms release water first.' },
      { title: 'Warm the tortillas', instruction: 'Warm tortillas in a dry skillet for 20–30 seconds per side and keep under a clean tea towel.', minutes: 4, tip: 'Warm tortillas are more pliable.' },
      { title: 'Build your tacos', instruction: 'Divide mushrooms among tortillas. Top with pickled onion, chopped coriander and lime juice.', minutes: 3, tip: 'Layer ingredients lightly so each bite stays balanced.' },
      { title: 'Serve right away', instruction: 'Add extra chili if you like and serve while tortillas are warm.', minutes: 2, tip: 'Offer extra lime wedges at the table.' }
    ]
  },
  {
    id: 'tagine', name: 'Sunset vegetable tagine', subtitle: 'Slow warmth from Marrakech',
    country: 'Morocco', region: 'Africa', minutes: 50, difficulty: 'Medium', servings: 2,
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&q=85',
    accent: '#d6b68c', tags: ['One pot', 'Plant-based', 'Aromatic'],
    story: 'A fragrant Moroccan-inspired vegetable stew with soft chickpeas, warm spices and a bright lemon finish.',
    ingredients: [
      { id: 'carrot', name: 'Carrots', amount: 2, unit: 'whole', kind: 'carrot' },
      { id: 'eggplant', name: 'Small aubergine', amount: 1, unit: 'whole', kind: 'eggplant' },
      { id: 'chickpeas', name: 'Cooked chickpeas', amount: 240, unit: 'g', kind: 'mushroom' },
      { id: 'onion', name: 'Onion', amount: 1, unit: 'whole', kind: 'onion' },
      { id: 'tomato', name: 'Chopped tomatoes', amount: 250, unit: 'g', kind: 'tomato' },
      { id: 'cumin', name: 'Ground cumin', amount: 2, unit: 'tsp', kind: 'chili' },
      { id: 'cinnamon', name: 'Ground cinnamon', amount: 0.5, unit: 'tsp', kind: 'garlic' },
      { id: 'lemon', name: 'Lemon', amount: 1, unit: 'whole', kind: 'lemon' }
    ],
    steps: [
      { title: 'Prepare the vegetables', instruction: 'Dice the onion and aubergine. Cut carrots into thick coins. Drain and rinse chickpeas.', minutes: 8, tip: 'Similar-sized pieces cook at the same pace.' },
      { title: 'Toast the spices', instruction: 'Cook onion in olive oil until soft. Add cumin and cinnamon and stir for 30 seconds until fragrant.', minutes: 7, tip: 'Low heat prevents ground spices scorching.' },
      { title: 'Build the stew', instruction: 'Add carrots, aubergine, tomatoes, chickpeas and 250 ml water. Season and bring to a gentle simmer.', minutes: 5, tip: 'The vegetables should be partly submerged, not swimming.' },
      { title: 'Cook low and slow', instruction: 'Cover and simmer for 25 minutes until carrots are tender, stirring occasionally.', minutes: 25, tip: 'Add water by the tablespoon if the sauce thickens too much.' },
      { title: 'Brighten the flavor', instruction: 'Squeeze in lemon juice, taste and adjust salt. Add chopped herbs if available.', minutes: 3, tip: 'A squeeze of citrus lifts warm spices.' },
      { title: 'Serve with couscous', instruction: 'Spoon into warm bowls and serve with fluffy couscous or crusty bread.', minutes: 2, tip: 'Let it rest briefly before serving.' }
    ]
  },
  {
    id: 'green-curry', name: 'Coconut green curry', subtitle: 'Fresh, fragrant, vibrant',
    country: 'Thailand', region: 'Asia', minutes: 35, difficulty: 'Medium', servings: 2,
    image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=1200&q=85',
    accent: '#b5d2a1', tags: ['Coconut', 'Spicy', 'Fragrant'],
    story: 'A Thai-inspired green curry with silky coconut milk, tender vegetables and an aromatic herb finish.',
    ingredients: [
      { id: 'coconut', name: 'Coconut milk', amount: 400, unit: 'ml', kind: 'lemon' },
      { id: 'paste', name: 'Green curry paste', amount: 2, unit: 'tbsp', kind: 'chili' },
      { id: 'eggplant', name: 'Aubergine', amount: 1, unit: 'small', kind: 'eggplant' },
      { id: 'mushrooms', name: 'Mushrooms', amount: 150, unit: 'g', kind: 'mushroom' },
      { id: 'pepper', name: 'Bell pepper', amount: 1, unit: 'whole', kind: 'tomato' },
      { id: 'lime', name: 'Lime', amount: 1, unit: 'whole', kind: 'lime' },
      { id: 'basil', name: 'Thai basil or fresh basil', amount: 15, unit: 'g', kind: 'herb' }
    ],
    steps: [
      { title: 'Slice the vegetables', instruction: 'Cut aubergine into bite-sized pieces, slice the pepper and halve the mushrooms.', minutes: 7, tip: 'Keep the aubergine pieces fairly small.' },
      { title: 'Wake up the curry paste', instruction: 'Spoon the thick coconut cream from the can into a pan. Fry curry paste in it for 2 minutes until aromatic.', minutes: 4, tip: 'Check your curry paste label for spice level and allergens.' },
      { title: 'Add coconut milk', instruction: 'Pour in the remaining coconut milk and 100 ml water. Bring to a gentle simmer.', minutes: 3, tip: 'Avoid boiling hard to keep the sauce smooth.' },
      { title: 'Simmer the vegetables', instruction: 'Add aubergine, pepper and mushrooms. Cook 12–15 minutes until tender.', minutes: 15, tip: 'Vegetables should stay bright and just tender.' },
      { title: 'Balance the curry', instruction: 'Season with lime juice and a little sugar or soy sauce to taste. Stir in basil.', minutes: 3, tip: 'Aim for a balance of salty, sweet, spicy and sour.' },
      { title: 'Serve over rice', instruction: 'Ladle into bowls with steamed jasmine rice and extra lime wedges.', minutes: 3, tip: 'Fresh basil goes in right at the end.' }
    ]
  },
  {
    id: 'spanakopita', name: 'Crispy spinach pie', subtitle: 'Golden layers, green heart',
    country: 'Greece', region: 'Europe', minutes: 55, difficulty: 'A little project', servings: 2,
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=85',
    accent: '#d9d9a7', tags: ['Baked', 'Vegetarian', 'Sharing'],
    story: 'Inspired by Greek spanakopita: flaky filo pastry with a savory spinach, feta and herb filling.',
    ingredients: [
      { id: 'spinach', name: 'Fresh spinach', amount: 300, unit: 'g', kind: 'herb' },
      { id: 'feta', name: 'Feta cheese', amount: 150, unit: 'g', kind: 'mushroom' },
      { id: 'filo', name: 'Filo pastry sheets', amount: 6, unit: 'sheets', kind: 'carrot' },
      { id: 'onion', name: 'Small onion', amount: 1, unit: 'whole', kind: 'onion' },
      { id: 'dill', name: 'Fresh dill', amount: 10, unit: 'g', kind: 'herb' },
      { id: 'lemon', name: 'Lemon zest', amount: 1, unit: 'tsp', kind: 'lemon' },
      { id: 'oil', name: 'Olive oil', amount: 3, unit: 'tbsp', kind: 'lime' }
    ],
    steps: [
      { title: 'Prepare the oven', instruction: 'Preheat oven to 190°C / 375°F. Lightly oil a small baking dish and keep filo covered with a damp towel.', minutes: 5, tip: 'Filo dries out quickly when exposed to air.' },
      { title: 'Wilt the spinach', instruction: 'Cook spinach in a large pan until wilted. Cool slightly, squeeze out excess moisture and chop.', minutes: 8, tip: 'Dry spinach is essential for crisp pastry.' },
      { title: 'Mix the filling', instruction: 'Soften chopped onion in a little oil. Mix with spinach, crumbled feta, dill and lemon zest.', minutes: 7, tip: 'Feta is salty; taste before adding extra salt.' },
      { title: 'Layer the pastry', instruction: 'Lay three filo sheets into the dish, brushing each lightly with oil. Add filling and cover with remaining sheets.', minutes: 10, tip: 'Tuck in the edges gently to seal the filling.' },
      { title: 'Bake until golden', instruction: 'Score the top lightly, brush with oil and bake 22–25 minutes until crisp and deeply golden.', minutes: 25, tip: 'Check after 20 minutes; ovens vary.' },
      { title: 'Rest and slice', instruction: 'Let the pie rest for 5 minutes before cutting into generous squares.', minutes: 5, tip: 'Resting keeps the layers neat when sliced.' }
    ]
  }
];

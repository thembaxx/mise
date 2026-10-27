import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { RecipePage, ShoppingPage } from './components/RecipePages';
import CookbookPage from './components/CookbookPage';
import { findRecipe } from './lib/personal-cookbook';
import './styles.css';
import { trackInputModality } from './motion/preferences';

const stopTracking = trackInputModality();
if (import.meta.hot) import.meta.hot.dispose(stopTracking);

const recipeRoute = /^\/recipes\/([a-z0-9-]+)\/?$/.exec(window.location.pathname);
const shoppingRoute = /^\/shopping\/?$/.test(window.location.pathname);
const cookbookRoute = /^\/cookbook\/?$/.test(window.location.pathname);
const page = recipeRoute
  ? <RecipePage recipe={findRecipe(recipeRoute[1])}/>
  : shoppingRoute ? <ShoppingPage/> : cookbookRoute ? <CookbookPage/> : <App/>;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{page}</React.StrictMode>
);
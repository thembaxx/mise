import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { RecipePage, ShoppingPage } from './components/RecipePages';
import { recipes } from './data/recipes';
import './styles.css';

const recipeRoute = /^\/recipes\/([a-z0-9-]+)\/?$/.exec(window.location.pathname);
const shoppingRoute = /^\/shopping\/?$/.test(window.location.pathname);
const page = recipeRoute
  ? <RecipePage recipe={recipes.find(recipe => recipe.id === recipeRoute[1])}/>
  : shoppingRoute ? <ShoppingPage/> : <App/>;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{page}</React.StrictMode>
);
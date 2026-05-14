/**
 * Classe DOMManager
 * Gère toutes les manipulations directes du DOM (Document Object Model) pour le plateau de jeu.
 * Le fait de séparer l'affichage (ici) de la logique métier (Game.js) est une excellente pratique.
 */
export class DOMManager {

  /**
   * Génère et injecte dynamiquement les éléments HTML des cartes sur le plateau de jeu.
   * * @param {Array<Object>} images - Tableau d'objets contenant les informations des cartes (id, name, url)
   */
  createCards(images) {
    // On cible le conteneur principal du plateau pour en créer une variable
    const gameBoard = document.querySelector('.game-board');

    //  vide complètement le plateau pour le joueur s'il relance une partie
    gameBoard.innerHTML = '';

    // On parcourt chaque image pour construire le HTML de la carte
    images.forEach((image, index) => {

      // Création de l'enveloppe extérieure de la carte
      const cardElement = document.createElement('div');
      cardElement.classList.add('card');

      // Stockage des données vitales dans les attributs HTML 'data-*' pour que Game.js puisse lire l'id de la carte
      cardElement.dataset.pokemonId = image.id;
      cardElement.dataset.index = index;

      // Création du recto et du verso de la carte
      cardElement.innerHTML = `
        <div class="card-inner">
          <div class="card-front">
            <img src="assets/images/doscarte.png" alt="Dos de carte">
          </div>
          
          <div class="card-back">
            <img src="${image.url}" alt="${image.name}">
          </div>
        </div>
      `;

      // Ajout final de la carte complète dans le plateau
      gameBoard.appendChild(cardElement);
    });
  }
}
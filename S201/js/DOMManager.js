export class DOMManager {


  /**
   * Ajoute toutes les images d'une collection sur le gameBoard
   * @param {Image[]} images
   */
  createCards(images) {
    const gameBoard = document.querySelector('.game-board');
    gameBoard.innerHTML = ''; // On vide le plateau avant d'y ajouter des choses
    // Todo À Compléter


    images.forEach((image, index) => {
      const cardElement = document.createElement('div');
      cardElement.classList.add('card');

      //On stocke les infos utiles
      cardElement.dataset.pokemonId = image.id;
      cardElement.dataset.index = index;

      // On réutilise la structure conseillée
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

      gameBoard.appendChild(cardElement);
    });
    /**
     * Voici un exemple de contenu de card permettant de contenir une partie masqué
     * et l'image qui doit être révélée.
     *
     <div class="card-inner">
     <div class="card-front">
     <img src="./assets/images/mask1.jpg" alt="Hidden card">
     </div>
     <div class="card-back hidden">
     <img src="${image.url}" alt="${image.name}">
     </div>
     </div>
     */

  }
}

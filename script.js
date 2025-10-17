const boardSize = 6;

// Representação separada:
// playerShips / enemyShips: 0 = vazio, 1 = navio
// playerState / enemyState: 0 = desconhecido, 2 = revelado acerto(hit), 3 = revelado erro(miss)
let playerShips, enemyShips, playerState, enemyState;
let shipsToPlace, selectedShip, selectedOrientation;
let questions = [];
let gameStarted = false;
let modalOpen = false;

initAll(); // inicializa tudo na carga da página

function initAll() {
  // inicializa variáveis e estado do jogo
  playerShips = Array(boardSize).fill().map(() => Array(boardSize).fill(0));
  enemyShips  = Array(boardSize).fill().map(() => Array(boardSize).fill(0));
  playerState = Array(boardSize).fill().map(() => Array(boardSize).fill(0));
  enemyState  = Array(boardSize).fill().map(() => Array(boardSize).fill(0));

  shipsToPlace = [
    { size: 2, placed: false },
    { size: 3, placed: false },
    { size: 4, placed: false }
  ];
  selectedShip = null;
  selectedOrientation = "horizontal";
  gameStarted = false;
  modalOpen = false;

  initQuestions();

  // re-enable ship buttons and orientation
  document.querySelectorAll(".ship-btn").forEach(btn => {
    btn.classList.remove("disabled");
    btn.disabled = false;
  });

  // ensure enemy section visible state resets (enemy board shown only when game starts)
  document.getElementById("enemy-board").style.pointerEvents = "auto";
  document.getElementById("enemy-board").parentElement.style.opacity = 1;
  document.getElementById("enemy-board").parentElement.style.display = "block";

  // hide restart button
  document.getElementById("restart-btn").style.display = "none";

  // attach listeners again (in case)
  attachControlListeners();

  // render initial boards (placement phase)
  renderBoard("player-board", true);
  renderBoard("enemy-board", false);
  // hide enemy-board visual titles until start? We'll keep visible but unclickable until start.
  document.getElementById("enemy-board").parentElement.style.display = "block";
}

function attachControlListeners() {
  document.querySelectorAll(".ship-btn").forEach(btn => {
    btn.onclick = () => {
      if (btn.classList.contains("disabled")) return;
      selectedShip = shipsToPlace.find(s => s.size == btn.dataset.size && !s.placed);
      if (selectedShip) {
        document.getElementById("status").textContent =
          `Navio de ${selectedShip.size} casas selecionado. Escolha a posição.`;
      }
    };
  });

  document.querySelectorAll(".orientation-btn").forEach(btn => {
    btn.onclick = () => {
      selectedOrientation = btn.dataset.orientation;
    };
  });

  // restart button handler
  document.getElementById("restart-btn").onclick = () => {
    resetGame();
  };
}

function renderBoard(id, isPlayer = false) {
  const div = document.getElementById(id);
  div.innerHTML = "";
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      // apply classes based on state
      if (isPlayer) {
        if (playerShips[i][j] === 1) cell.classList.add("ship");
        if (playerState[i][j] === 2) cell.classList.add("hit");
        if (playerState[i][j] === 3) cell.classList.add("miss");
      } else {
        // enemy board: do NOT show ships; only show revealed states
        if (enemyState[i][j] === 2) cell.classList.add("hit");
        if (enemyState[i][j] === 3) cell.classList.add("miss");
      }

      // attach click handlers
      cell.addEventListener("click", () => {
        if (isPlayer) {
          if (!gameStarted) placeShip(i, j);
        } else {
          if (!gameStarted) return;
          askQuestion(i, j);
        }
      });

      div.appendChild(cell);
    }
  }
}

function canPlaceShip(boardShips, x, y, size, orientation) {
  if (orientation === "horizontal") {
    if (y + size > boardSize) return false;
    for (let j = 0; j < size; j++) {
      if (boardShips[x][y+j] !== 0) return false;
    }
  } else {
    if (x + size > boardSize) return false;
    for (let i = 0; i < size; i++) {
      if (boardShips[x+i][y] !== 0) return false;
    }
  }
  return true;
}

function addShipTo(boardShips, x, y, size, orientation) {
  if (orientation === "horizontal") {
    for (let j = 0; j < size; j++) boardShips[x][y+j] = 1;
  } else {
    for (let i = 0; i < size; i++) boardShips[x+i][y] = 1;
  }
}

function placeShip(x, y) {
  if (!selectedShip) return;
  if (canPlaceShip(playerShips, x, y, selectedShip.size, selectedOrientation)) {
    addShipTo(playerShips, x, y, selectedShip.size, selectedOrientation);
    renderBoard("player-board", true);

    selectedShip.placed = true;
    let btn = document.querySelector(`.ship-btn[data-size='${selectedShip.size}']`);
    if (btn) {
      btn.classList.add("disabled");
      btn.disabled = true;
    }

    selectedShip = null;
    document.getElementById("status").textContent = "Navio colocado com sucesso!";

    if (shipsToPlace.every(s => s.placed)) {
      showStartButton();
    }
  } else {
    document.getElementById("status").textContent = "Posição inválida.";
  }
}

function showStartButton() {
  // create Start button if not present
  if (!document.querySelector(".start-btn") || document.querySelector(".start-btn").dataset.autocreated !== "true") {
    // remove existing if any (safe)
    const existing = document.querySelector(".start-btn[data-autocreated='true']");
    if (existing) existing.remove();
  }

  // create a start button near controls if not present
  if (!document.querySelector(".start-btn[data-role='start-game']")) {
    let startBtn = document.createElement("button");
    startBtn.textContent = "Iniciar Jogo";
    startBtn.classList.add("start-btn");
    startBtn.dataset.role = "start-game";
    document.getElementById("controls").appendChild(startBtn);

    startBtn.addEventListener("click", () => {
      document.getElementById("status").textContent = "O jogo começou!";
      startBtn.remove();
      startGame();
    });
  }
}

function startGame() {
  // reset enemy arrays just in case
  enemyShips = Array(boardSize).fill().map(() => Array(boardSize).fill(0));
  enemyState = Array(boardSize).fill().map(() => Array(boardSize).fill(0));

  placeEnemyShipsRandomly();
  gameStarted = true;
  renderBoard("enemy-board", false);
  renderBoard("player-board", true);

  // ensure restart hidden
  document.getElementById("restart-btn").style.display = "none";
}

function askQuestion(x, y) {
  // if already resolved, deny
  if (enemyState[x][y] === 2 || enemyState[x][y] === 3) return;
  if (modalOpen) return;

  const modal = document.getElementById("question-modal");
  const q = questions[x * boardSize + y];
  document.getElementById("question-text").textContent = q.q;
  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";

  q.options.forEach((opt, i) => {
    let btn = document.createElement("button");
    btn.textContent = opt;
    btn.onclick = () => {
      modalOpen = false;
      if (i === q.answer) {
        // Player answered CORRECTLY -> reveal this enemy square
        if (enemyShips[x][y] === 1) {
          enemyState[x][y] = 2; // hit a ship -> red
          document.getElementById("status").textContent = "Acertou! Navio encontrado!";
        } else {
          enemyState[x][y] = 3; // revealed miss -> white
          document.getElementById("status").textContent = "Resposta correta, mas não havia navio.";
        }
        renderBoard("enemy-board", false);

        // check for player victory
        if (checkVictory(enemyShips, enemyState)) {
          endGame("player");
          modal.style.display = "none";
          return;
        }

        // After player's successful reveal, enemy performs a turn
        setTimeout(() => enemyTurn(), 400);
      } else {
        // Player answered WRONG -> do not change enemyState (remains blue)
        document.getElementById("status").textContent = "Resposta incorreta. O quadrado permanece inalterado.";
        // enemy still gets a turn
        setTimeout(() => enemyTurn(), 400);
      }
      modal.style.display = "none";
    };
    optionsDiv.appendChild(btn);
  });

  modal.style.display = "block";
  modalOpen = true;
}

// close modal by clicking outside
window.onclick = function(event) {
  const modal = document.getElementById("question-modal");
  if (event.target === modal) {
    modal.style.display = "none";
    modalOpen = false;
  }
};

// ---------------- Enemy ship placement random ----------------
function placeEnemyShipsRandomly() {
  // use same sizes as player ships
  const sizes = shipsToPlace.map(s => s.size);
  sizes.forEach(size => {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 1000) {
      attempts++;
      const orientation = Math.random() < 0.5 ? "horizontal" : "vertical";
      const x = Math.floor(Math.random() * boardSize);
      const y = Math.floor(Math.random() * boardSize);
      if (canPlaceShip(enemyShips, x, y, size, orientation)) {
        addShipTo(enemyShips, x, y, size, orientation);
        placed = true;
      }
    }
    if (!placed) console.warn("Não foi possível colocar um navio inimigo de tamanho", size);
  });
}

// ---------------- Enemy turn (AI random) ----------------
function enemyTurn() {
  if (!gameStarted) return;

  // pick a random cell where playerState is 0
  const choices = [];
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      if (playerState[i][j] === 0) choices.push([i, j]);
    }
  }
  if (choices.length === 0) return;

  const [x, y] = choices[Math.floor(Math.random() * choices.length)];
  if (playerShips[x][y] === 1) {
    playerState[x][y] = 2; // hit
    document.getElementById("status").textContent = `O inimigo acertou seu navio em (${x+1}, ${y+1})!`;
  } else {
    playerState[x][y] = 3; // miss
    document.getElementById("status").textContent = `O inimigo atirou em (${x+1}, ${y+1}) e errou.`;
  }

  renderBoard("player-board", true);

  // check if enemy won
  if (checkVictory(playerShips, playerState)) {
    endGame("enemy");
  }
}

// ---------------- Victory check ----------------
function checkVictory(shipsMatrix, stateMatrix) {
  // victory when every cell with ship (1) has corresponding state === 2 (hit)
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      if (shipsMatrix[i][j] === 1 && stateMatrix[i][j] !== 2) return false;
    }
  }
  return true;
}

// ---------------- End game + Restart ----------------
function endGame(winner) {
  gameStarted = false;
  // close modal if open
  const modal = document.getElementById("question-modal");
  modal.style.display = "none";
  modalOpen = false;

  if (winner === "player") {
    setTimeout(() => alert("Parabéns — você encontrou todos os navios inimigos!"), 50);
    document.getElementById("status").textContent = "Você venceu!";
  } else {
    setTimeout(() => alert("Você perdeu — todos os seus navios foram encontrados!"), 50);
    document.getElementById("status").textContent = "Você perdeu!";
  }

  // show restart button
  const restartBtn = document.getElementById("restart-btn");
  restartBtn.style.display = "inline-block";
}

// reinicia tudo e leva para fase de posicionamento
function resetGame() {
  // reset variables & UI
  initAll();
  document.getElementById("status").textContent = "Escolha um navio e sua orientação para posicionar.";
  // hide enemy board until start (user will place ships then click Iniciar)
  document.getElementById("enemy-board").parentElement.style.display = "block";
  renderBoard("player-board", true);
  renderBoard("enemy-board", false);
}


// -------- Instruções --------
const instructionsBtn = document.getElementById("instructions-btn");
const instructionsModal = document.getElementById("instructions-modal");
const closeInstructions = document.getElementById("close-instructions");

instructionsBtn.onclick = () => {
  instructionsModal.style.display = "block";
};

closeInstructions.onclick = () => {
  instructionsModal.style.display = "none";
};

// Fecha modal clicando fora
window.addEventListener("click", function(event) {
  if (event.target === instructionsModal) {
    instructionsModal.style.display = "none";
  }
});


// ---------------- Questions initialization ----------------
function initQuestions() {
  questions = [
    {q:"Em que ano ocorreu a Batalha do Riachuelo?", options:["1860","1865","1870","1880"], answer:1},
    {q:"Qual país enfrentou o Brasil na Batalha do Riachuelo?", options:["Argentina","Paraguai","Uruguai","Chile"], answer:1},
    {q:"Quem era o comandante brasileiro na batalha?", options:["Tamandaré","Barroso","Osório","Caxias"], answer:1},
    {q:"O rio Riachuelo é afluente de qual rio?", options:["Amazonas","Paraná","Paraguai","São Francisco"], answer:2},
    {q:"Qual foi o navio-chefe brasileiro na batalha?", options:["Amazonas","Parnaíba","Tamandaré","Belmonte"], answer:0},
    {q:"Quem liderava o Paraguai na época?", options:["Solano López","Carlos Antonio López","Artigas","Rosás"], answer:0},
    {q:"A batalha ocorreu em qual guerra?", options:["Guerra do Paraguai","Guerra da Cisplatina","Farroupilha","Cabana"], answer:0},
    {q:"Em que dia ocorreu a batalha?", options:["11 de junho de 1865","7 de setembro de 1865","15 de agosto de 1865","1º de maio de 1865"], answer:0},
    {q:"Qual a importância estratégica da batalha?", options:["Garantir domínio naval","Proteger fronteiras","Apoiar tropas terrestres","Capturar Montevidéu"], answer:0},
    {q:"Quantos navios brasileiros participaram?", options:["9","11","13","15"], answer:1},
    {q:"Qual país apoiava o Brasil contra o Paraguai?", options:["Chile","Uruguai","Argentina","Bolívia"], answer:2},
    {q:"Quem disse a frase 'O Brasil espera que cada um cumpra o seu dever'?", options:["Caxias","Barroso","Tamandaré","Floriano"], answer:1},
    {q:"Qual resultado imediato da batalha?", options:["Vitória brasileira","Vitória paraguaia","Empate","Suspensão das hostilidades"], answer:0},
    {q:"Que tipo de embarcação foi decisiva?", options:["Couraçados","Vapor","Fragatas","Submarinos"], answer:1},
    {q:"Qual foi a principal tática de Barroso?", options:["Romper a linha inimiga","Emboscada","Bater em retirada","Bloqueio"], answer:0},
    {q:"A batalha consolidou o controle de quem nos rios?", options:["Paraguai","Brasil","Argentina","Uruguai"], answer:1},
    {q:"A vitória de Riachuelo elevou o moral de quem?", options:["Paraguai","Brasil","Argentina","Chile"], answer:1},
    {q:"Qual país sofreu pesadas perdas navais?", options:["Brasil","Argentina","Paraguai","Uruguai"], answer:2},
    {q:"Qual navio brasileiro encalhou mas continuou lutando?", options:["Parnaíba","Amazonas","Belmonte","Tamandaré"], answer:0},
    {q:"Que efeito a batalha teve na guerra?", options:["Prolongou","Encurtou","Virou ponto decisivo","Não influenciou"], answer:2},
    {q:"Quem era o imperador do Brasil na época?", options:["Dom Pedro I","Dom Pedro II","Regente Feijó","Floriano"], answer:1},
    {q:"Qual arma foi usada pelos paraguaios em seus navios?", options:["Torpedos","Canhões","Mísseis","Submarinos"], answer:1},
    {q:"O Brasil contou com apoio de qual tipo de tropa na região?", options:["Voluntários da Pátria","Mercenários","Estrangeiros","Índios"], answer:0},
    {q:"A Batalha de Riachuelo foi decisiva para qual frente?", options:["Naval","Terrestre","Aérea","Diplomática"], answer:0},
    {q:"O nome 'Riachuelo' refere-se a quê?", options:["Navio","Localidade","Rio afluente","Canhão"], answer:2},
    {q:"Qual foi o comandante paraguaio na batalha?", options:["Meza","López","Caballero","Francia"], answer:0},
    {q:"A esquadra brasileira era composta majoritariamente por navios de que tipo?", options:["Vapores a hélice","Canoa","Submarino","Veleiros"], answer:0},
    {q:"Após Riachuelo, o Brasil manteve controle de qual rio?", options:["Paraná","Uruguai","Paraguai","São Francisco"], answer:2},
    {q:"A batalha ocorreu em qual província?", options:["Corrientes","Misiones","Assunção","Rio Grande"], answer:0},
    {q:"Qual navio brasileiro abalroou embarcações inimigas?", options:["Amazonas","Parnaíba","Belmonte","Araguaia"], answer:0},
    {q:"Riachuelo foi considerada por muitos como:", options:["Batalha decisiva","Derrota humilhante","Combate irrelevante","Pequena escaramuça"], answer:0},
    {q:"O comandante Barroso era conhecido como:", options:["Almirante","General","Marechal","Capitão"], answer:0},
    {q:"A esquadra brasileira tinha apoio de qual império?", options:["Britânico","Francês","Nenhum","Espanhol"], answer:2},
    {q:"A batalha foi parte de qual campanha?", options:["Campanha Naval","Campanha da Cisplatina","Campanha do Acre","Campanha Platina"], answer:0},
    {q:"Qual lema ficou marcado após a vitória?", options:["O Brasil espera que cada um cumpra o seu dever","Independência ou morte","Avante soldados","Progresso e ordem"], answer:0},
    {q:"A vitória consolidou a supremacia naval de qual país?", options:["Brasil","Paraguai","Argentina","Uruguai"], answer:0}
  ];
}

// initial render for placement phase
renderBoard("player-board", true);
renderBoard("enemy-board", false);

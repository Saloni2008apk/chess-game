
const game = new Chess();

const board = document.getElementById("board");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("message");
const historyEl = document.getElementById("history");
const undoBtn = document.getElementById("undoBtn");
const restartBtn = document.getElementById("restartBtn");
const flipBtn = document.getElementById("flipBtn");

const pieces = {
  wK: "♔", wQ: "♕", wR: "♖",
  wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜",
  bB: "♝", bN: "♞", bP: "♟"
};

let selected = null;
let legalMoves = [];
let flipped = false;
let lastMove = null;

function renderBoard() {
  board.innerHTML = "";

  const files = flipped
    ? ["h", "g", "f", "e", "d", "c", "b", "a"]
    : ["a", "b", "c", "d", "e", "f", "g", "h"];

  const ranks = flipped
    ? ["1", "2", "3", "4", "5", "6", "7", "8"]
    : ["8", "7", "6", "5", "4", "3", "2", "1"];

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const squareName = files[f] + ranks[r];
      const piece = game.get(squareName);

      const square = document.createElement("button");
      square.type = "button";
      square.className = "square";

      // a1 is dark; h1 is light.
      const fileIndex = squareName.charCodeAt(0) - 97;
      const rankIndex = Number(squareName[1]) - 1;
      square.classList.add(
        (fileIndex + rankIndex) % 2 === 0 ? "dark" : "light"
      );

      if (selected === squareName) {
        square.classList.add("selected");
      }

      if (
        lastMove &&
        (lastMove.from === squareName || lastMove.to === squareName)
      ) {
        square.classList.add("last-move");
      }

      const targetMove = legalMoves.find(
        move => move.to === squareName
      );

      if (targetMove) {
        square.classList.add(
          targetMove.captured ? "capture" : "legal"
        );
      }

      if (piece) {
        const symbol = pieces[piece.color + piece.type.toUpperCase()];
        const span = document.createElement("span");
        span.textContent = symbol;
        span.className =
          piece.color === "w" ? "piece-white" : "piece-black";
        square.appendChild(span);
      }

      // Label the edge squares.
      if (f === 0) {
        const rankLabel = document.createElement("span");
        rankLabel.className = "coordinate";
        rankLabel.textContent = ranks[r];
        square.appendChild(rankLabel);
      }

      if (r === 7) {
        const fileLabel = document.createElement("span");
        fileLabel.className = "coordinate";
        fileLabel.textContent = files[f];
        square.appendChild(fileLabel);
      }

      square.setAttribute(
        "aria-label",
        squareName + (piece ? ", " + piece.color + " " + piece.type : "")
      );

      square.addEventListener("click", () => handleSquareClick(squareName));
      board.appendChild(square);
    }
  }

  renderStatus();
  renderHistory();
}

function handleSquareClick(squareName) {
  if (game.game_over()) return;

  const piece = game.get(squareName);

  // Select one of your own pieces.
  if (
    piece &&
    piece.color === game.turn() &&
    selected !== squareName
  ) {
    selected = squareName;
    legalMoves = game.moves({
      square: squareName,
      verbose: true
    });
    renderBoard();
    messageEl.textContent = legalMoves.length
      ? "Choose a highlighted destination."
      : "This piece has no legal moves.";
    return;
  }

  // Attempt to move the selected piece.
  if (selected) {
    const candidate = legalMoves.find(
      move => move.to === squareName
    );

    if (candidate) {
      const movingPiece = game.get(selected);

      let promotion;

      if (
        movingPiece &&
        movingPiece.type === "p" &&
        (squareName[1] === "8" || squareName[1] === "1")
      ) {
        const choice = prompt(
          "Promote pawn to: queen, rook, bishop, or knight?",
          "queen"
        );

        const choices = {
          queen: "q", q: "q",
          rook: "r", r: "r",
          bishop: "b", b: "b",
          knight: "n", n: "n"
        };

        promotion = choices[
          (choice || "queen").trim().toLowerCase()
        ] || "q";
      }

      const result = game.move({
        from: selected,
        to: squareName,
        ...(promotion ? { promotion } : {})
      });

      if (result) {
        lastMove = { from: result.from, to: result.to };
      }

      selected = null;
      legalMoves = [];
      renderBoard();
      return;
    }
  }

  selected = null;
  legalMoves = [];
  messageEl.textContent = "Select one of your pieces.";
  renderBoard();
}

function renderStatus() {
  const turn = game.turn() === "w" ? "White" : "Black";

  if (game.in_checkmate()) {
    statusEl.textContent = "Checkmate!";
    messageEl.textContent =
      (game.turn() === "w" ? "Black" : "White") + " wins!";
  } else if (game.in_stalemate()) {
    statusEl.textContent = "Draw";
    messageEl.textContent = "Stalemate: no legal moves.";
  } else if (game.in_draw()) {
    statusEl.textContent = "Draw";
    messageEl.textContent = "The game has ended in a draw.";
  } else if (game.in_check()) {
    statusEl.textContent = turn + " is in check!";
    messageEl.textContent = "Your king is under attack.";
  } else {
    statusEl.textContent = turn + " to move";
    messageEl.textContent = selected
      ? "Choose a highlighted destination."
      : "Select a piece to see its legal moves.";
  }

  undoBtn.disabled = game.history().length === 0;
}

function renderHistory() {
  const history = game.history();

  if (history.length === 0) {
    historyEl.textContent = "No moves yet.";
    return;
  }

  historyEl.innerHTML = "";

  for (let i = 0; i < history.length; i += 2) {
    const row = document.createElement("div");
    row.className = "move-row";

    const number = document.createElement("span");
    number.textContent = (Math.floor(i / 2) + 1) + ".";

    const white = document.createElement("span");
    white.textContent = history[i];

    const black = document.createElement("span");
    black.textContent = history[i + 1] || "";

    row.append(number, white, black);
    historyEl.appendChild(row);
  }

  historyEl.scrollTop = historyEl.scrollHeight;
}

undoBtn.addEventListener("click", () => {
  const undone = game.undo();

  if (undone) {
    selected = null;
    legalMoves = [];
    lastMove = null;

    const history = game.history({ verbose: true });
    const previous = history[history.length - 1];

    if (previous) {
      lastMove = {
        from: previous.from,
        to: previous.to
      };
    }

    renderBoard();
  }
});

restartBtn.addEventListener("click", () => {
  game.reset();
  selected = null;
  legalMoves = [];
  lastMove = null;
  renderBoard();
});

flipBtn.addEventListener("click", () => {
  flipped = !flipped;
  renderBoard();
});

renderBoard();

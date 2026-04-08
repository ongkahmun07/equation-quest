const answerForm = document.getElementById("answerForm");
const answerInput = document.getElementById("answerInput");
const equationText = document.getElementById("equationText");
const equationHint = document.getElementById("equationHint");
const statusText = document.getElementById("statusText");
const tipText = document.getElementById("tipText");
const scoreValue = document.getElementById("scoreValue");
const streakValue = document.getElementById("streakValue");
const solvedValue = document.getElementById("solvedValue");
const showAnswerButton = document.getElementById("showAnswerButton");
const skipButton = document.getElementById("skipButton");
const challengeTitle = document.getElementById("challengeTitle");
const difficultyChips = document.getElementById("difficultyChips");
const whiteboardCanvas = document.getElementById("whiteboardCanvas");
const whiteboardOverlay = document.getElementById("whiteboardOverlay");
const whiteboardFrame = document.getElementById("whiteboardFrame");
const whiteboardStage = document.getElementById("whiteboardStage");
const whiteboardPanel = document.querySelector(".whiteboard-panel");
const boardTools = document.getElementById("boardTools");
const workingInput = document.getElementById("workingInput");
const checkBoardButton = document.getElementById("checkBoardButton");
const controlsToDisable = [
  answerInput,
  workingInput,
  showAnswerButton,
  skipButton,
  checkBoardButton,
];
const modeLabels = {
  mixed: "Mixed Practice",
  numbers: "Number Workout",
  fractions: "Fraction Focus",
  decimals: "Decimal Dash",
  percentages: "Percentage Power",
};

const tipsByMode = {
  mixed: "Mixed mode gives you a fresh blend of Primary 6-style questions.",
  numbers: "Use estimation first, then work carefully through the arithmetic.",
  fractions: "Look for common denominators and simplify when possible.",
  decimals: "Line up place values carefully before adding or subtracting.",
  percentages: "Remember that 10% is one-tenth, so you can build other percentages from it.",
};

const state = {
  mode: "mixed",
  score: 0,
  streak: 0,
  solved: 0,
  currentQuestion: null,
  queuedQuestion: null,
  boardTool: "pen",
  isLoadingQuestion: false,
  pendingQuestionAdvance: false,
  lastInputWarningAt: 0,
  currentQuestionSource: "local",
};

const boardContext = whiteboardCanvas.getContext("2d");
const overlayContext = whiteboardOverlay.getContext("2d");
let isDrawing = false;
let lastDrawPoint = null;
let lastMidPoint = null;
let activePointerId = null;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(items) {
  return items[randomInt(0, items.length - 1)];
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }

  return x || 1;
}

function simplifyFraction(numerator, denominator) {
  const divisor = gcd(numerator, denominator);
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
}

function formatFraction(numerator, denominator) {
  return `${numerator}/${denominator}`;
}

function createNumberQuestion() {
  const templates = [
    () => {
      const a = randomInt(120, 950);
      const b = randomInt(35, 240);
      return {
        prompt: `${a} + ${b} = ?`,
        answer: String(a + b),
        hint: "Add the hundreds, tens, and ones carefully.",
        skill: "numbers",
        workingChecks: ["+", String(a), String(b)],
        workingTip: "Show the two numbers you are combining, or mention place values such as hundreds and tens.",
      };
    },
    () => {
      const a = randomInt(400, 980);
      const b = randomInt(120, a - 30);
      return {
        prompt: `${a} - ${b} = ?`,
        answer: String(a - b),
        hint: "Regroup if needed and subtract by place value.",
        skill: "numbers",
        workingChecks: ["-", String(a), String(b)],
        workingTip: "Try writing the subtraction setup or mention regrouping/borrowing in your working.",
      };
    },
    () => {
      const a = randomInt(12, 48);
      const b = randomInt(3, 12);
      return {
        prompt: `${a} x ${b} = ?`,
        answer: String(a * b),
        hint: "Use multiplication facts or break one number apart.",
        skill: "numbers",
        workingChecks: ["x", String(a), String(b)],
        workingTip: "A strong method shows repeated groups, times facts, or a breakdown such as 20 x 4 + 3 x 4.",
      };
    },
    () => {
      const divisor = randomInt(3, 12);
      const quotient = randomInt(6, 24);
      const dividend = divisor * quotient;
      return {
        prompt: `${dividend} / ${divisor} = ?`,
        answer: String(quotient),
        hint: "Think: what number multiplied by the divisor gives the dividend?",
        skill: "numbers",
        workingChecks: ["/", String(dividend), String(divisor)],
        workingTip: "Useful working links division and multiplication, for example 12 x 8 = 96 so 96 / 12 = 8.",
      };
    },
  ];

  return randomChoice(templates)();
}

function createFractionQuestion() {
  const templates = [
    () => {
      const denominator = randomChoice([4, 5, 6, 8, 10, 12]);
      const left = randomInt(1, denominator - 1);
      const right = randomInt(1, denominator - left);
      const simplified = simplifyFraction(left + right, denominator);
      return {
        prompt: `${formatFraction(left, denominator)} + ${formatFraction(right, denominator)} = ?`,
        answer: formatFraction(simplified.numerator, simplified.denominator),
        hint: "The denominators are the same, so add only the numerators and simplify.",
        skill: "fractions",
        workingChecks: [formatFraction(left, denominator), formatFraction(right, denominator), String(denominator)],
        workingTip: "Show that the denominators stay the same and only the numerators are added before simplifying.",
      };
    },
    () => {
      const denominator = randomChoice([4, 5, 6, 8, 10, 12]);
      const top = randomInt(2, denominator - 1);
      const bottom = randomInt(1, top - 1);
      const simplified = simplifyFraction(top - bottom, denominator);
      return {
        prompt: `${formatFraction(top, denominator)} - ${formatFraction(bottom, denominator)} = ?`,
        answer: formatFraction(simplified.numerator, simplified.denominator),
        hint: "Subtract the numerators, then check whether the fraction can be simplified.",
        skill: "fractions",
        workingChecks: [formatFraction(top, denominator), formatFraction(bottom, denominator), String(denominator)],
        workingTip: "A clear method keeps the denominator fixed, subtracts the numerators, then simplifies the result.",
      };
    },
    () => {
      const whole = randomInt(2, 9);
      const denominator = randomChoice([2, 4, 5, 10]);
      const numerator = randomInt(1, denominator - 1);
      const answer = simplifyFraction(whole * denominator + numerator, denominator);
      return {
        prompt: `${whole} + ${formatFraction(numerator, denominator)} = ?`,
        answer: formatFraction(answer.numerator, answer.denominator),
        hint: "Turn the whole number into a fraction with the same denominator first.",
        skill: "fractions",
        workingChecks: [String(whole), formatFraction(numerator, denominator), String(denominator)],
        workingTip: "Good working converts the whole number into an equivalent fraction before adding.",
      };
    },
  ];

  return randomChoice(templates)();
}

function createDecimalQuestion() {
  const templates = [
    () => {
      const a = (randomInt(12, 95) / 10).toFixed(1);
      const b = (randomInt(11, 84) / 10).toFixed(1);
      return {
        prompt: `${a} + ${b} = ?`,
        answer: (Number(a) + Number(b)).toFixed(1),
        hint: "Line up the decimal points before adding.",
        skill: "decimals",
        workingChecks: [a, b, "."],
        workingTip: "Show the decimal numbers lined up or mention tenths when you explain your method.",
      };
    },
    () => {
      const a = (randomInt(130, 290) / 10).toFixed(1);
      const b = (randomInt(25, 120) / 10).toFixed(1);
      return {
        prompt: `${a} - ${b} = ?`,
        answer: (Number(a) - Number(b)).toFixed(1),
        hint: "Subtract the tenths and ones separately.",
        skill: "decimals",
        workingChecks: [a, b, "."],
        workingTip: "A helpful method lines up decimal points so each place value stays in the right column.",
      };
    },
    () => {
      const whole = randomInt(12, 48);
      return {
        prompt: `${whole} / 10 = ?`,
        answer: (whole / 10).toFixed(1),
        hint: "Dividing by 10 shifts every digit one place to the right.",
        skill: "decimals",
        workingChecks: [String(whole), "/10", "10"],
        workingTip: "Try showing the place-value shift, for example 34 becomes 3.4 when divided by 10.",
      };
    },
  ];

  return randomChoice(templates)();
}

function createPercentageQuestion() {
  const templates = [
    () => {
      const base = randomChoice([40, 50, 60, 80, 100, 120, 200]);
      const percent = randomChoice([10, 20, 25, 50]);
      return {
        prompt: `${percent}% of ${base} = ?`,
        answer: String((percent / 100) * base),
        hint: "Convert the percentage to a fraction or decimal, then multiply.",
        skill: "percentages",
        workingChecks: [`${percent}%`, String(base)],
        workingTip: "Strong working converts the percentage to a fraction or decimal before finding the amount.",
      };
    },
    () => {
      const base = randomChoice([60, 80, 120, 160, 200]);
      const divisor = randomChoice([2, 4, 5, 10]);
      const part = base / divisor;
      const percent = (part / base) * 100;
      return {
        prompt: `${part} is what percentage of ${base}?`,
        answer: String(percent),
        hint: "Use part divided by whole, then multiply by 100.",
        skill: "percentages",
        workingChecks: [String(part), String(base), "100"],
        workingTip: "A strong percentage method uses part / whole x 100.",
      };
    },
    () => {
      const original = randomChoice([80, 120, 160, 200, 240]);
      const percent = randomChoice([10, 20, 25]);
      const increase = (percent / 100) * original;
      return {
        prompt: `${original} increased by ${percent}% = ?`,
        answer: String(original + increase),
        hint: "Find the percentage amount first, then add it to the original value.",
        skill: "percentages",
        workingChecks: [String(original), `${percent}%`],
        workingTip: "Show the increase amount first, then add it back to the original value.",
      };
    },
  ];

  return randomChoice(templates)();
}

function createQuestion() {
  const pool = state.mode === "mixed"
    ? ["numbers", "fractions", "decimals", "percentages"]
    : [state.mode];

  const selectedMode = randomChoice(pool);

  switch (selectedMode) {
    case "numbers":
      return { ...createNumberQuestion(), family: selectedMode };
    case "fractions":
      return { ...createFractionQuestion(), family: selectedMode };
    case "decimals":
      return { ...createDecimalQuestion(), family: selectedMode };
    case "percentages":
      return { ...createPercentageQuestion(), family: selectedMode };
    default:
      return { ...createNumberQuestion(), family: "numbers" };
  }
}

async function askGemini(prompt) {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Gemini request failed.");
  }

  return data.text || "";
}

async function askGeminiWithImage(prompt, imageData, imageMimeType = "image/png") {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      imageData,
      imageMimeType,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Gemini image request failed.");
  }

  return data.text || "";
}

function parseJsonResponse(rawText) {
  const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(cleaned);
}

function normaliseQuestion(question) {
  return {
    prompt: String(question.prompt || question.question || "0 + 0 = ?"),
    answer: String(question.answer || "0"),
    hint: String(question.hint || "Work carefully and check your method."),
    skill: String(question.skill || state.mode || "mixed"),
    workingTip: String(question.workingTip || tipsByMode[state.mode] || "Show your method clearly."),
    workingChecks: Array.isArray(question.workingChecks) ? question.workingChecks.map(String) : [],
    source: String(question.source || "gemini"),
  };
}

async function generateGeminiQuestion() {
  const selectedMode = state.mode === "mixed" ? "mixed Primary 6 mathematics topics" : `${state.mode} questions`;
  const prompt = [
    "You are generating one mathematics practice question for a Primary 6 student.",
    `Topic mode: ${selectedMode}.`,
    "Return only valid JSON with these keys:",
    'prompt, answer, hint, skill, workingTip, workingChecks',
    "Rules:",
    "- Keep the question suitable for Primary 6.",
    "- Use plain text only.",
    "- The answer must be short and exact.",
    "- workingChecks must be an array of 2 to 4 short strings that should appear in good written working.",
    "- Do not include markdown fences.",
    "- Use one-step or two-step arithmetic only.",
    "- Allowed topics: whole numbers, fractions, decimals, percentages.",
  ].join("\n");

  const text = await askGemini(prompt);
  return normaliseQuestion(parseJsonResponse(text));
}

function setControlsDisabled(disabled) {
  controlsToDisable.forEach((control) => {
    control.disabled = disabled;
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.disabled = disabled;
  });

  document.querySelectorAll(".tool-button").forEach((button) => {
    button.disabled = disabled;
  });
}

function setWorkingFeedback(message, tone = "") {
  tipText.textContent = message;
  tipText.classList.remove("is-success", "is-error");
  if (tone) {
    tipText.classList.add(tone);
  }
}

function clearOverlay() {
  overlayContext.clearRect(0, 0, whiteboardOverlay.width, whiteboardOverlay.height);
}

function drawErrorCircle(circle) {
  if (!circle) {
    return;
  }

  const x = Number(circle.x);
  const y = Number(circle.y);
  const radius = Number(circle.radius);

  if ([x, y, radius].some((value) => Number.isNaN(value))) {
    return;
  }

  const ratio = window.devicePixelRatio || 1;
  const width = whiteboardOverlay.width / ratio;
  const height = whiteboardOverlay.height / ratio;

  clearOverlay();
  overlayContext.strokeStyle = "#ff6b6b";
  overlayContext.lineWidth = 5;
  overlayContext.setLineDash([14, 10]);
  overlayContext.beginPath();
  overlayContext.arc(x * width, y * height, radius * Math.min(width, height), 0, Math.PI * 2);
  overlayContext.stroke();
  overlayContext.setLineDash([]);
}

function normaliseAnswer(value) {
  return value.trim().replace(/\s+/g, "").replace(/,+/g, ".");
}

function answersMatch(userAnswer, expectedAnswer) {
  const normalisedUser = normaliseAnswer(userAnswer);
  const normalisedExpected = normaliseAnswer(expectedAnswer);

  if (normalisedUser === normalisedExpected) {
    return true;
  }

  const userNumber = Number(normalisedUser);
  const expectedNumber = Number(normalisedExpected);

  if (!Number.isNaN(userNumber) && !Number.isNaN(expectedNumber)) {
    return Math.abs(userNumber - expectedNumber) < 0.0001;
  }

  return false;
}

function setStatus(message, tone = "") {
  statusText.textContent = message;
  statusText.classList.remove("is-success", "is-error");

  if (tone) {
    statusText.classList.add(tone);
  }
}

function updateScoreboard() {
  scoreValue.textContent = String(state.score);
  streakValue.textContent = String(state.streak);
  solvedValue.textContent = String(state.solved);
}

function captureCanvasSnapshot(sourceCanvas) {
  if (!sourceCanvas.width || !sourceCanvas.height) {
    return null;
  }

  const snapshot = document.createElement("canvas");
  snapshot.width = sourceCanvas.width;
  snapshot.height = sourceCanvas.height;
  const snapshotContext = snapshot.getContext("2d");
  snapshotContext.drawImage(sourceCanvas, 0, 0);
  return snapshot;
}

function loadQuestion() {
  const usingQueuedQuestion = Boolean(state.queuedQuestion);
  state.currentQuestion = state.queuedQuestion || createQuestion();
  state.queuedQuestion = null;
  state.currentQuestionSource = usingQueuedQuestion ? "gemini" : "local";
  equationText.textContent = state.currentQuestion.prompt;
  equationHint.textContent = state.currentQuestion.hint;
  setWorkingFeedback(state.currentQuestion.workingTip || tipsByMode[state.mode]);
  answerInput.value = "";
  workingInput.value = "";
  clearBoard();
  clearOverlay();
  state.pendingQuestionAdvance = false;
  answerInput.focus();
}

async function loadQuestionWithGemini(options = {}) {
  const {
    preserveCurrent = false,
    statusMessage = "Loading a new Gemini question...",
  } = options;

  state.isLoadingQuestion = true;
  setControlsDisabled(true);
  setStatus(statusMessage, "");

  if (!preserveCurrent) {
    equationText.textContent = "Preparing your next challenge...";
    equationHint.textContent = "Gemini is creating a Primary 6 question for you.";
  }

  try {
    const geminiQuestion = await generateGeminiQuestion();
    if (preserveCurrent) {
      state.queuedQuestion = geminiQuestion;
      setStatus("Gemini has prepared your next question.", "is-success");
    } else {
      state.currentQuestion = geminiQuestion;
      state.currentQuestionSource = "gemini";
      equationText.textContent = state.currentQuestion.prompt;
      equationHint.textContent = state.currentQuestion.hint;
      setWorkingFeedback(state.currentQuestion.workingTip || tipsByMode[state.mode]);
      answerInput.value = "";
      workingInput.value = "";
      clearBoard();
      clearOverlay();
      state.pendingQuestionAdvance = false;
      setStatus("Gemini question ready.", "is-success");
    }
  } catch (error) {
    if (!preserveCurrent) {
      loadQuestion();
      setStatus(`Gemini is unavailable, so I loaded a local question instead. ${error.message}`, "is-error");
    } else {
      state.queuedQuestion = null;
      setStatus(`Still using the quick local question while Gemini warms up. ${error.message}`, "is-error");
    }
  } finally {
    state.isLoadingQuestion = false;
    setControlsDisabled(false);
    answerInput.focus();
  }
}

function analyseWorking() {
  const working = workingInput.value.trim();

  if (!working) {
    return {
      quality: "missing",
      message: "Your final answer can be checked, but add typed working too so I can give feedback on your method.",
    };
  }

  const normalisedWorking = working.toLowerCase().replace(/\s+/g, "");
  const checks = state.currentQuestion.workingChecks || [];
  const matches = checks.filter((check) => normalisedWorking.includes(String(check).toLowerCase().replace(/\s+/g, ""))).length;
  const ratio = checks.length ? matches / checks.length : 0;

  if (ratio >= 0.75) {
    return {
      quality: "strong",
      message: `Your working shows the key parts of the method. ${state.currentQuestion.workingTip}`,
    };
  }

  if (ratio >= 0.4) {
    return {
      quality: "partial",
      message: `Your working is on the right track, but make the method clearer. ${state.currentQuestion.workingTip}`,
    };
  }

  return {
    quality: "weak",
    message: `I cannot see the full method yet. ${state.currentQuestion.workingTip}`,
  };
}

async function analyseWorkingWithGemini(userAnswer) {
  const prompt = [
    "You are reviewing a Primary 6 student's mathematics work.",
    "Return only valid JSON with keys:",
    'statusTone, statusMessage, workingTone, workingFeedback',
    `Question: ${state.currentQuestion.prompt}`,
    `Expected answer: ${state.currentQuestion.answer}`,
    `Question hint: ${state.currentQuestion.hint}`,
    `Student final answer: ${userAnswer}`,
    `Student typed working: ${workingInput.value.trim() || "(none)"}`,
    "Rules:",
    "- statusTone must be success or error.",
    "- workingTone must be success, neutral, or error.",
    "- Give short, specific feedback about the method.",
    "- Mention what is missing if the working is unclear.",
    "- Do not use markdown fences.",
  ].join("\n");

  const text = await askGemini(prompt);
  return parseJsonResponse(text);
}

async function analyseWhiteboardWithGemini() {
  const dataUrl = whiteboardCanvas.toDataURL("image/png");
  const [, base64Data = ""] = dataUrl.split(",");

  const prompt = [
    "You are reviewing a Primary 6 student's handwritten mathematics working from a whiteboard image.",
    "Find the clearest localised mathematical mistake if one exists.",
    "Return only valid JSON with keys:",
    'feedback, hasError, circle',
    `Question: ${state.currentQuestion.prompt}`,
    `Expected answer: ${state.currentQuestion.answer}`,
    `Typed working notes: ${workingInput.value.trim() || "(none)"}`,
    "Rules:",
    "- feedback should be short and specific.",
    "- hasError must be true or false.",
    "- circle must be null if no localised error is visible.",
    "- otherwise circle must contain x, y, radius as numbers between 0 and 1 using the full image width and height.",
    "- circle the exact handwritten step that looks wrong, not the entire solution.",
    "- Do not use markdown fences.",
  ].join("\n");

  const text = await askGeminiWithImage(prompt, base64Data, "image/png");
  return parseJsonResponse(text);
}

function setMode(mode) {
  state.mode = mode;
  challengeTitle.textContent = modeLabels[mode];

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.mode === mode);
  });

  state.queuedQuestion = null;
  loadQuestion();
  setStatus(`Switched to ${modeLabels[mode]}. Using a quick local question to save Gemini usage.`, "");
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  const frameBounds = whiteboardFrame.getBoundingClientRect();
  const canvasWidth = Math.max(frameBounds.width - 2, 960);
  const canvasHeight = window.innerWidth <= 720 ? 900 : 1050;
  const boardSnapshot = captureCanvasSnapshot(whiteboardCanvas);
  const overlaySnapshot = captureCanvasSnapshot(whiteboardOverlay);

  whiteboardCanvas.width = canvasWidth * ratio;
  whiteboardCanvas.height = canvasHeight * ratio;
  whiteboardCanvas.style.width = `${canvasWidth}px`;
  whiteboardCanvas.style.height = `${canvasHeight}px`;
  boardContext.setTransform(ratio, 0, 0, ratio, 0, 0);

  whiteboardOverlay.width = canvasWidth * ratio;
  whiteboardOverlay.height = canvasHeight * ratio;
  whiteboardOverlay.style.width = `${canvasWidth}px`;
  whiteboardOverlay.style.height = `${canvasHeight}px`;
  overlayContext.setTransform(ratio, 0, 0, ratio, 0, 0);

  clearBoard();
  clearOverlay();
  whiteboardStage.style.minHeight = `${canvasHeight}px`;

  if (boardSnapshot) {
    boardContext.drawImage(
      boardSnapshot,
      0,
      0,
      boardSnapshot.width,
      boardSnapshot.height,
      0,
      0,
      whiteboardCanvas.width,
      whiteboardCanvas.height,
    );
  }

  if (overlaySnapshot) {
    overlayContext.drawImage(
      overlaySnapshot,
      0,
      0,
      overlaySnapshot.width,
      overlaySnapshot.height,
      0,
      0,
      whiteboardOverlay.width,
      whiteboardOverlay.height,
    );
  }
}

function clearBoard() {
  boardContext.clearRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
}

function getPoint(event) {
  const bounds = whiteboardCanvas.getBoundingClientRect();
  return {
    x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getBoardPoint(event) {
  const point = getPoint(event);
  const pressure = typeof event.pressure === "number" && event.pressure > 0
    ? clamp(event.pressure, 0.08, 1)
    : 0.5;

  return {
    ...point,
    pressure,
  };
}

function getMidPoint(firstPoint, secondPoint) {
  return {
    x: (firstPoint.x + secondPoint.x) / 2,
    y: (firstPoint.y + secondPoint.y) / 2,
    pressure: (firstPoint.pressure + secondPoint.pressure) / 2,
  };
}

function smoothPoint(point) {
  if (!lastDrawPoint) {
    return point;
  }

  const smoothing = state.boardTool === "eraser" ? 0.52 : 0.38;

  return {
    x: lastDrawPoint.x + (point.x - lastDrawPoint.x) * smoothing,
    y: lastDrawPoint.y + (point.y - lastDrawPoint.y) * smoothing,
    pressure: lastDrawPoint.pressure + (point.pressure - lastDrawPoint.pressure) * smoothing,
  };
}

function isLikelyStylusTouch(event) {
  const width = Number(event.width || 0);
  const height = Number(event.height || 0);
  const pressure = Number(event.pressure || 0);

  return width <= 18 && height <= 18 && pressure <= 0.65;
}

function shouldAcceptPointer(event) {
  if (state.boardTool === "scroll") {
    return false;
  }

  if (event.pointerType === "pen") {
    return true;
  }

  if (event.pointerType === "touch") {
    return isLikelyStylusTouch(event);
  }

  return false;
}

function warnNonPenInput() {
  const now = Date.now();
  if (now - state.lastInputWarningAt < 2000) {
    return;
  }

  state.lastInputWarningAt = now;
  setStatus(
    state.boardTool === "scroll"
      ? "Scroll mode is on. Switch back to Pen to write."
      : "Apple Pencil is preferred on the whiteboard. Large finger touches are ignored.",
    "",
  );
}

function configureBrush(point) {
  boardContext.lineCap = "round";
  boardContext.lineJoin = "round";
  boardContext.imageSmoothingEnabled = true;

  if (state.boardTool === "eraser") {
    boardContext.globalCompositeOperation = "destination-out";
    boardContext.lineWidth = 24;
  } else {
    boardContext.globalCompositeOperation = "source-over";
    boardContext.strokeStyle = "#f8fbff";
    boardContext.lineWidth = 2.8 + ((point?.pressure ?? 0.5) * 1.8);
  }
}

function drawStrokeSegment(point) {
  const nextPoint = smoothPoint(point);
  configureBrush(nextPoint);

  if (!lastDrawPoint) {
    boardContext.beginPath();
    boardContext.arc(nextPoint.x, nextPoint.y, boardContext.lineWidth / 2, 0, Math.PI * 2);
    boardContext.fillStyle = state.boardTool === "eraser" ? "rgba(0,0,0,1)" : "#f8fbff";
    boardContext.fill();
    lastDrawPoint = nextPoint;
    lastMidPoint = nextPoint;
    return;
  }

  const midPoint = getMidPoint(lastDrawPoint, nextPoint);

  boardContext.beginPath();
  boardContext.moveTo(lastMidPoint.x, lastMidPoint.y);
  boardContext.quadraticCurveTo(lastDrawPoint.x, lastDrawPoint.y, midPoint.x, midPoint.y);
  boardContext.stroke();
  lastDrawPoint = nextPoint;
  lastMidPoint = midPoint;
}

function finishStroke() {
  if (!lastDrawPoint || !lastMidPoint) {
    return;
  }

  configureBrush(lastDrawPoint);
  boardContext.beginPath();
  boardContext.moveTo(lastMidPoint.x, lastMidPoint.y);
  boardContext.lineTo(lastDrawPoint.x, lastDrawPoint.y);
  boardContext.stroke();
}

function drawPoint(event) {
  const events = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [event];
  for (const currentEvent of events) {
    drawStrokeSegment(getBoardPoint(currentEvent));
  }
}

function startDrawing(event) {
  if (!shouldAcceptPointer(event)) {
    return;
  }

  event.preventDefault();
  isDrawing = true;
  activePointerId = event.pointerId;
  whiteboardCanvas.setPointerCapture(event.pointerId);
  const point = getBoardPoint(event);
  lastDrawPoint = point;
  lastMidPoint = point;
  drawStrokeSegment(point);
}

function stopDrawing(event) {
  if (!isDrawing || (event?.pointerId !== undefined && event.pointerId !== activePointerId)) {
    return;
  }

  if (event?.pointerId !== undefined) {
    whiteboardCanvas.releasePointerCapture(event.pointerId);
  }

  finishStroke();
  isDrawing = false;
  lastDrawPoint = null;
  lastMidPoint = null;
  activePointerId = null;
}

function setBoardTool(tool) {
  state.boardTool = tool;

  document.querySelectorAll(".tool-button[data-tool]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === tool);
  });

  whiteboardCanvas.classList.toggle("is-scroll-mode", tool === "scroll");

  if (tool === "scroll") {
    stopDrawing();
  }
}

answerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (state.isLoadingQuestion || !state.currentQuestion) {
    return;
  }

  const userAnswer = answerInput.value.trim();
  if (!userAnswer) {
    setStatus("Type an answer before checking.", "is-error");
    return;
  }

  setControlsDisabled(true);
  setStatus("Checking your answer and working...", "");

  const localWorkingFeedback = analyseWorking();

  try {
    const geminiFeedback = await analyseWorkingWithGemini(userAnswer);
    const statusTone = geminiFeedback.statusTone === "success" ? "is-success" : "is-error";
    const workingTone = geminiFeedback.workingTone === "success"
      ? "is-success"
      : geminiFeedback.workingTone === "error"
        ? "is-error"
        : "";

    setWorkingFeedback(
      String(geminiFeedback.workingFeedback || localWorkingFeedback.message),
      workingTone,
    );

    const isCorrect = answersMatch(userAnswer, state.currentQuestion.answer);
    if (isCorrect) {
      state.score += 10;
      state.streak += 1;
      state.solved += 1;
      state.pendingQuestionAdvance = true;
      updateScoreboard();
      setStatus(
        String(geminiFeedback.statusMessage || `Correct. The answer is ${state.currentQuestion.answer}. Click New Question when you are ready.`),
        statusTone,
      );
      return;
    }

    state.streak = 0;
    updateScoreboard();
    setStatus(
      String(geminiFeedback.statusMessage || `Not quite. Try again or reveal the answer. ${localWorkingFeedback.message}`),
      "is-error",
    );
    return;
  } catch (error) {
    const workingTone = localWorkingFeedback.quality === "strong"
      ? "is-success"
      : localWorkingFeedback.quality === "weak" || localWorkingFeedback.quality === "missing"
        ? "is-error"
        : "";
    setWorkingFeedback(localWorkingFeedback.message, workingTone);

    if (answersMatch(userAnswer, state.currentQuestion.answer)) {
      state.score += 10;
      state.streak += 1;
      state.solved += 1;
      state.pendingQuestionAdvance = true;
      updateScoreboard();
      setStatus(
        `Correct. The answer is ${state.currentQuestion.answer}. Gemini feedback is unavailable right now, so local feedback is shown.`,
        "is-success",
      );
      return;
    }

    state.streak = 0;
    updateScoreboard();
    setStatus(
      `Not quite. ${localWorkingFeedback.message} Gemini feedback is unavailable right now: ${error.message}`,
      "is-error",
    );
  } finally {
    setControlsDisabled(false);
  }
});

skipButton.addEventListener("click", async () => {
  if (state.isLoadingQuestion) {
    return;
  }

  state.streak = 0;
  updateScoreboard();
  state.queuedQuestion = null;
  loadQuestion();
  setStatus(
    state.pendingQuestionAdvance
      ? "Next question loaded instantly using local mode."
      : "Question loaded instantly using local mode.",
    "",
  );
});

showAnswerButton.addEventListener("click", () => {
  state.streak = 0;
  updateScoreboard();
  setStatus(`Answer shown: ${state.currentQuestion.answer}.`, "");
});

difficultyChips.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip || state.isLoadingQuestion) {
    return;
  }

  setMode(chip.dataset.mode);
});

boardTools.addEventListener("click", (event) => {
  const button = event.target.closest(".tool-button");
  if (!button) {
    return;
  }

  if (button.id === "clearBoardButton") {
    clearBoard();
    clearOverlay();
    setStatus("Whiteboard cleared.", "");
    return;
  }

  if (button.id === "checkBoardButton") {
    return;
  }

  setBoardTool(button.dataset.tool);
});

whiteboardCanvas.addEventListener("pointerdown", (event) => {
  startDrawing(event);
});

whiteboardCanvas.addEventListener("pointermove", (event) => {
  if (!isDrawing) {
    return;
  }

  if (event.pointerId !== activePointerId) {
    return;
  }

  event.preventDefault();
  drawPoint(event);
});

whiteboardCanvas.addEventListener("pointerup", stopDrawing);
whiteboardCanvas.addEventListener("pointerleave", stopDrawing);
whiteboardCanvas.addEventListener("pointercancel", stopDrawing);
whiteboardCanvas.addEventListener("pointerdown", (event) => {
  if (!shouldAcceptPointer(event)) {
    warnNonPenInput();
  }
});
whiteboardFrame.addEventListener("selectstart", (event) => {
  event.preventDefault();
});
whiteboardCanvas.addEventListener("dragstart", (event) => {
  event.preventDefault();
});
window.addEventListener("resize", resizeCanvas);

checkBoardButton.addEventListener("click", async () => {
  if (state.isLoadingQuestion || !state.currentQuestion) {
    return;
  }

  setControlsDisabled(true);
  clearOverlay();
  setStatus("Gemini is checking your work...", "");

  try {
    const result = await analyseWhiteboardWithGemini();
    drawErrorCircle(result.circle);
    setWorkingFeedback(
      String(result.feedback || "Whiteboard checked."),
      result.hasError ? "is-error" : "is-success",
    );
    setStatus(
      result.hasError
        ? "Whiteboard checked. The marked circle shows the likely error."
        : "Whiteboard checked. No clear localised error was found.",
      result.hasError ? "is-error" : "is-success",
    );
  } catch (error) {
    setStatus(`Whiteboard check failed: ${error.message}`, "is-error");
  } finally {
    setControlsDisabled(false);
  }
});

updateScoreboard();
resizeCanvas();
loadQuestion();
setStatus("Quick question ready. Gemini is used only when checking work or the whiteboard.", "");

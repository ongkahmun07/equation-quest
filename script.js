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
const whiteboardFrame = document.getElementById("whiteboardFrame");
const whiteboardStage = document.getElementById("whiteboardStage");
const whiteboardPanel = document.querySelector(".whiteboard-panel");
const boardTools = document.getElementById("boardTools");
const checkBoardButton = document.getElementById("checkBoardButton");
const controlsToDisable = [
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
  simultaneous: "Simultaneous Equations",
};

const tipsByMode = {
  mixed: "Mixed mode gives you a fresh blend of Primary 6-style questions.",
  numbers: "Use estimation first, then work carefully through the arithmetic.",
  fractions: "Look for common denominators and simplify when possible.",
  decimals: "Line up place values carefully before adding or subtracting.",
  percentages: "Remember that 10% is one-tenth, so you can build other percentages from it.",
  simultaneous: "Pick one variable to eliminate first, then solve step by step and substitute back to check.",
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

const boardState = {
  strokes: [],
  currentStroke: null,
};
let boardStageInstance = null;
let boardLayer = null;
let isDrawing = false;
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
          workedSolution: `Step 1: Write ${a} + ${b}.\nStep 2: Add the ones, tens, and hundreds carefully.\nStep 3: ${a} + ${b} = ${a + b}.`,
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
        workedSolution: `Step 1: Write ${a} - ${b}.\nStep 2: Regroup if any top digit is smaller than the bottom digit.\nStep 3: Subtract each place value carefully.\nStep 4: ${a} - ${b} = ${a - b}.`,
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
        workedSolution: `Step 1: Write ${a} x ${b}.\nStep 2: Use a known times fact or split one factor into easier parts.\nStep 3: Multiply to get ${a * b}.\nStep 4: ${a} x ${b} = ${a * b}.`,
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
        workedSolution: `Step 1: Think of the related multiplication fact.\nStep 2: Find the number that makes ${divisor} x ? = ${dividend}.\nStep 3: ${divisor} x ${quotient} = ${dividend}, so ${dividend} / ${divisor} = ${quotient}.`,
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
        workedSolution: `Step 1: The denominators are both ${denominator}, so keep the denominator ${denominator}.\nStep 2: Add the numerators: ${left} + ${right} = ${left + right}.\nStep 3: This gives ${formatFraction(left + right, denominator)}.\nStep 4: Simplify if possible to get ${formatFraction(simplified.numerator, simplified.denominator)}.`,
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
        workedSolution: `Step 1: The denominators are both ${denominator}, so keep the denominator ${denominator}.\nStep 2: Subtract the numerators: ${top} - ${bottom} = ${top - bottom}.\nStep 3: This gives ${formatFraction(top - bottom, denominator)}.\nStep 4: Simplify if possible to get ${formatFraction(simplified.numerator, simplified.denominator)}.`,
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
        workedSolution: `Step 1: Turn ${whole} into a fraction with denominator ${denominator}: ${whole} = ${whole * denominator}/${denominator}.\nStep 2: Add the fractions: ${whole * denominator}/${denominator} + ${numerator}/${denominator} = ${whole * denominator + numerator}/${denominator}.\nStep 3: Simplify if possible to get ${formatFraction(answer.numerator, answer.denominator)}.`,
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
        workedSolution: `Step 1: Line up the decimal points.\nStep 2: Add ${a} and ${b} by place value.\nStep 3: ${a} + ${b} = ${(Number(a) + Number(b)).toFixed(1)}.`,
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
        workedSolution: `Step 1: Line up the decimal points.\nStep 2: Subtract ${b} from ${a} by place value.\nStep 3: ${a} - ${b} = ${(Number(a) - Number(b)).toFixed(1)}.`,
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
        workedSolution: `Step 1: Dividing by 10 moves each digit one place to the right.\nStep 2: ${whole} becomes ${(whole / 10).toFixed(1)}.\nStep 3: So ${whole} / 10 = ${(whole / 10).toFixed(1)}.`,
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
        workedSolution: `Step 1: Convert ${percent}% to ${percent}/100.\nStep 2: Calculate ${percent}/100 x ${base} = ${(percent / 100) * base}.\nStep 3: So ${percent}% of ${base} = ${(percent / 100) * base}.`,
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
        workedSolution: `Step 1: Use part / whole x 100.\nStep 2: ${part} / ${base} x 100 = ${percent}.\nStep 3: So ${part} is ${percent}% of ${base}.`,
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
        workedSolution: `Step 1: Find ${percent}% of ${original}: ${percent}/100 x ${original} = ${increase}.\nStep 2: Add the increase to the original value: ${original} + ${increase} = ${original + increase}.\nStep 3: So the new value is ${original + increase}.`,
        workingChecks: [String(original), `${percent}%`],
        workingTip: "Show the increase amount first, then add it back to the original value.",
      };
    },
  ];

  return randomChoice(templates)();
}

function createSimultaneousQuestion() {
  const x = randomInt(1, 8);
  const y = randomInt(1, 8);
  const a1 = randomChoice([1, 2, 3]);
  const b1 = randomChoice([1, 2, 3, 4]);
  const a2 = randomChoice([1, 2, 3, 4]);
  const b2 = randomChoice([1, 2, 3]);

  if ((a1 * b2) === (a2 * b1)) {
    return createSimultaneousQuestion();
  }

  const c1 = (a1 * x) + (b1 * y);
  const c2 = (a2 * x) + (b2 * y);
  const scale1 = a2;
  const scale2 = a1;
  const scaledB1 = b1 * scale1;
  const scaledB2 = b2 * scale2;
  const scaledC1 = c1 * scale1;
  const scaledC2 = c2 * scale2;
  const yCoefficient = scaledB1 - scaledB2;
  const yValue = (scaledC1 - scaledC2) / yCoefficient;
  const xValue = (c1 - (b1 * yValue)) / a1;

  return {
    prompt: `Solve the simultaneous equations:\n${a1}x + ${b1}y = ${c1}\n${a2}x + ${b2}y = ${c2}`,
    answer: `x = ${x}, y = ${y}`,
    hint: "Eliminate one variable first, then substitute back to find the other.",
    skill: "simultaneous",
    workedSolution: `Step 1: Write the equations:\n${a1}x + ${b1}y = ${c1}\n${a2}x + ${b2}y = ${c2}.\nStep 2: Make the x-coefficients match by multiplying the first equation by ${scale1} and the second equation by ${scale2}.\nStep 3: This gives ${a1 * scale1}x + ${scaledB1}y = ${scaledC1} and ${a2 * scale2}x + ${scaledB2}y = ${scaledC2}.\nStep 4: Subtract the equations to eliminate x: ${yCoefficient}y = ${scaledC1 - scaledC2}, so y = ${yValue}.\nStep 5: Substitute y = ${yValue} into ${a1}x + ${b1}y = ${c1}.\nStep 6: ${a1}x + ${b1 * yValue} = ${c1}, so ${a1}x = ${c1 - (b1 * yValue)} and x = ${xValue}.\nStep 7: Therefore, x = ${xValue} and y = ${yValue}.`,
    workingChecks: ["eliminate", "substitute", "x =", "y ="],
    workingTip: "Show the elimination step clearly, then substitute back into one equation to find the second variable.",
  };
}

function createQuestion() {
  const pool = state.mode === "mixed"
    ? ["numbers", "fractions", "decimals", "percentages", "simultaneous"]
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
    case "simultaneous":
      return { ...createSimultaneousQuestion(), family: selectedMode };
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

function tryParseJsonObject(rawText) {
  const directText = String(rawText || "").trim();
  if (!directText) {
    return null;
  }

  try {
    return parseJsonResponse(directText);
  } catch {
    const firstBrace = directText.indexOf("{");
    const lastBrace = directText.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    const candidate = directText.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
}

function normaliseWhiteboardResult(result, rawText = "") {
  const summary = typeof result?.summary === "string" && result.summary.trim()
    ? result.summary.trim()
    : "";
  const stepReview = Array.isArray(result?.stepReview)
    ? result.stepReview
      .map((item) => ({
        step: String(item?.step || "").trim(),
        verdict: String(item?.verdict || "").trim().toLowerCase(),
        feedback: String(item?.feedback || "").trim(),
      }))
      .filter((item) => item.step || item.feedback)
    : [];
  const strengths = Array.isArray(result?.strengths)
    ? result.strengths.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const mistakes = Array.isArray(result?.mistakes)
    ? result.mistakes.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const nextSteps = Array.isArray(result?.nextSteps)
    ? result.nextSteps.map((item) => String(item).trim()).filter(Boolean)
    : [];

  const sections = [];

  if (summary) {
    sections.push(summary);
  }

  if (stepReview.length) {
    const wrongSteps = stepReview.filter((item) => item.verdict === "wrong" || item.verdict === "unclear");
    const rightSteps = stepReview.filter((item) => item.verdict === "correct");

    if (wrongSteps.length) {
      sections.push(`Step-by-step fixes:\n- ${wrongSteps.map((item) => `${item.step || "Step"}: ${item.feedback || "This step needs correction."}`).join("\n- ")}`);
    }

    if (rightSteps.length) {
      sections.push(`Correct steps noticed:\n- ${rightSteps.map((item) => `${item.step || "Step"}: ${item.feedback || "This part looks correct."}`).join("\n- ")}`);
    }
  }

  if (strengths.length) {
    sections.push(`What went well:\n- ${strengths.join("\n- ")}`);
  }

  if (mistakes.length) {
    sections.push(`What to fix:\n- ${mistakes.join("\n- ")}`);
  }

  if (nextSteps.length) {
    sections.push(`Next steps:\n- ${nextSteps.join("\n- ")}`);
  }

  const fallbackFeedback = typeof result?.feedback === "string" && result.feedback.trim()
    ? result.feedback.trim()
    : String(rawText || "Whiteboard checked.").trim();

  const feedback = sections.length ? sections.join("\n\n") : fallbackFeedback;

  const hasError = Boolean(result?.hasError);

  return {
    feedback,
    hasError,
  };
}

function getFriendlyWhiteboardErrorMessage(error) {
  const message = String(error?.message || "").toLowerCase();

  if (message.includes("quota") || message.includes("exceeded your current quota")) {
    return "Gemini whiteboard checking is temporarily unavailable because the quota is used up. You can still practise and use Show Answer.";
  }

  if (message.includes("high demand") || message.includes("overloaded") || message.includes("unavailable")) {
    return "Gemini whiteboard checking is busy right now. Please try again in a little while.";
  }

  if (message.includes("too many requests")) {
    return "Too many whiteboard checks were sent too quickly. Please wait a moment and try again.";
  }

  if (message.includes("missing gemini_api_key")) {
    return "Gemini whiteboard checking is not configured on the server right now.";
  }

  return "Gemini whiteboard checking is unavailable right now. You can still practise and use Show Answer.";
}

function normaliseQuestion(question) {
  return {
    prompt: String(question.prompt || question.question || "0 + 0 = ?"),
    answer: String(question.answer || "0"),
    hint: String(question.hint || "Work carefully and check your method."),
    skill: String(question.skill || state.mode || "mixed"),
    workedSolution: String(
      question.workedSolution
      || question.solution
      || `Step 1: Work through the calculation carefully.\nStep 2: Check each step.\nStep 3: Final answer: ${String(question.answer || "0")}.`,
    ),
    workingTip: String(question.workingTip || tipsByMode[state.mode] || "Show your method clearly."),
    workingChecks: Array.isArray(question.workingChecks) ? question.workingChecks.map(String) : [],
    source: String(question.source || "gemini"),
  };
}

async function generateGeminiQuestion() {
  const selectedMode = state.mode === "mixed" ? "mixed Primary 6 mathematics topics" : `${state.mode} questions`;
    const prompt = [
      "You are generating one mathematics practice question for a student.",
      `Topic mode: ${selectedMode}.`,
      "Return only valid JSON with these keys:",
      'prompt, answer, hint, skill, workedSolution, workingTip, workingChecks',
      "Rules:",
      "- Keep the question suitable for the topic mode. Primary arithmetic topics should stay simple, but simultaneous equations can be secondary level.",
      "- Use plain text only.",
      "- The answer must be short and exact.",
      "- workedSolution must show the full method step by step for a child.",
      "- workingChecks must be an array of 2 to 4 short strings that should appear in good written working.",
      "- Do not include markdown fences.",
      "- Use one-step or two-step arithmetic only.",
      "- Allowed topics: whole numbers, fractions, decimals, percentages, simultaneous equations.",
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

function loadQuestion() {
  const usingQueuedQuestion = Boolean(state.queuedQuestion);
  state.currentQuestion = state.queuedQuestion || createQuestion();
  state.queuedQuestion = null;
  state.currentQuestionSource = usingQueuedQuestion ? "gemini" : "local";
  equationText.textContent = state.currentQuestion.prompt;
  equationHint.textContent = state.currentQuestion.hint;
  setWorkingFeedback(state.currentQuestion.workingTip || tipsByMode[state.mode]);
  state.pendingQuestionAdvance = false;
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
  }
}

async function analyseWhiteboardWithGemini() {
  const dataUrl = boardStageInstance
    ? boardStageInstance.toDataURL({ pixelRatio: 1 })
    : "";
  const [, base64Data = ""] = dataUrl.split(",");

  const prompt = [
    "You are reviewing a student's handwritten mathematics working from a whiteboard image.",
    "Return only valid JSON with keys:",
    'summary, stepReview, strengths, mistakes, nextSteps, hasError',
    `Question: ${state.currentQuestion.prompt}`,
    `Expected answer: ${state.currentQuestion.answer}`,
    "Rules:",
    "- summary should be 1 or 2 sentences.",
    '- stepReview must be an array of objects with keys: step, verdict, feedback.',
    '- verdict must be one of: "correct", "wrong", "unclear".',
    "- Include one stepReview item for every readable step in the student's working.",
    "- If a step is wrong, explain exactly what is wrong in that step.",
    "- If a step is correct, briefly say why it is correct.",
    "- Keep the step labels in the order the child wrote them, for example Step 1, Step 2.",
    "- strengths must be an array of short points about correct parts of the working.",
    "- mistakes must be an array of short points about each likely mistake or missing step.",
    "- nextSteps must be an array of short coaching points telling the student what to do next.",
    "- hasError must be true or false.",
    "- Review the whole visible working, not just the final answer.",
    "- Check whether the working is complete enough for a teacher to follow.",
    "- Flag skipped steps, jumps in logic, or missing setup even if the final answer is correct.",
    "- If the child leaves out an important step, say exactly which step is missing.",
    "- If the child combines too many actions in one jump, explain what intermediate step should have been shown.",
    "- Reward complete, clearly shown methods and say when the working is thorough.",
    "- If some writing is unclear, say that clearly and still comment on any readable parts.",
    "- If the method is mostly correct, explain why in detail.",
    "- Keep every point specific to this student's work.",
    "- Do not use markdown fences.",
  ].join("\n");

  const text = await askGeminiWithImage(prompt, base64Data, "image/png");
  const parsed = tryParseJsonObject(text);

  if (parsed) {
    return normaliseWhiteboardResult(parsed, text);
  }

  return normaliseWhiteboardResult({
    summary: text || "Whiteboard checked, but the reply was not structured clearly.",
    stepReview: [],
    hasError: false,
  }, text);
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
  const frameBounds = whiteboardFrame.getBoundingClientRect();
  const canvasWidth = Math.max(frameBounds.width - 2, 960);
  const canvasHeight = window.innerWidth <= 720 ? 900 : 1050;

  whiteboardCanvas.style.width = `${canvasWidth}px`;
  whiteboardCanvas.style.height = `${canvasHeight}px`;
  whiteboardStage.style.minHeight = `${canvasHeight}px`;
  ensureBoardStage(canvasWidth, canvasHeight);
  redrawBoard();
}

function clearBoard() {
  if (!boardLayer) {
    return;
  }

  boardLayer.destroyChildren();
  boardLayer.draw();
}

function resetBoard() {
  boardState.strokes = [];
  boardState.currentStroke = null;
  clearBoard();
}

function getPoint(event) {
  if (!boardStageInstance) {
    return null;
  }

  return boardStageInstance.getPointerPosition();
}

function getBoardPoint(event) {
  return getPoint(event);
}

function shouldAcceptPointer(event) {
  if (state.boardTool === "scroll") {
    return false;
  }

  if (event.pointerType === "pen") {
    return true;
  }

  if (event.pointerType === "touch") {
    return true;
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
      : "Pen mode is on. Use Scroll mode whenever you want to move the board.",
    "",
  );
}

function configureBrush(point) {
  return {
    tool: state.boardTool,
    color: "#f8fbff",
    strokeWidth: state.boardTool === "eraser" ? 26 : 5,
  };
}

function ensureBoardStage(width, height) {
  if (!window.Konva) {
    throw new Error("Konva did not load.");
  }

  if (!boardStageInstance) {
    boardStageInstance = new window.Konva.Stage({
      container: "whiteboardCanvas",
      width,
      height,
    });

    boardLayer = new window.Konva.Layer();
    boardStageInstance.add(boardLayer);
    bindBoardStageEvents();
  } else {
    boardStageInstance.width(width);
    boardStageInstance.height(height);
  }

  updateBoardInteractionMode();
}

function drawStrokePath(stroke) {
  if (!stroke || stroke.points.length < 2 || !boardLayer) {
    return;
  }

  boardLayer.add(new window.Konva.Line({
    points: stroke.points,
    stroke: stroke.color,
    strokeWidth: stroke.strokeWidth,
    lineCap: "round",
    lineJoin: "round",
    tension: 0.5,
    globalCompositeOperation: stroke.tool === "eraser" ? "destination-out" : "source-over",
    listening: false,
  }));
}

function redrawBoard() {
  if (!boardLayer) {
    return;
  }

  clearBoard();
  boardState.strokes.forEach(drawStrokePath);

  if (boardState.currentStroke) {
    drawStrokePath(boardState.currentStroke);
  }

  boardLayer.draw();
}

function appendEventPointsToCurrentStroke(event) {
  if (!boardState.currentStroke) {
    return;
  }

  const nativeEvent = event?.evt ?? event;
  const events = typeof nativeEvent?.getCoalescedEvents === "function" ? nativeEvent.getCoalescedEvents() : [nativeEvent];
  for (const currentEvent of events) {
    if (currentEvent && boardStageInstance?.setPointersPositions) {
      boardStageInstance.setPointersPositions(currentEvent);
    }

    const point = getBoardPoint(currentEvent);
    if (!point) {
      continue;
    }

    boardState.currentStroke.points.push(point.x, point.y);
  }
}

function startDrawing(event) {
  const nativeEvent = event?.evt ?? event;

  if (!shouldAcceptPointer(nativeEvent)) {
    return;
  }

  nativeEvent.preventDefault();
  isDrawing = true;
  activePointerId = nativeEvent.pointerId ?? "mouse";
  const point = getBoardPoint(nativeEvent);
  if (!point) {
    return;
  }

  const brush = configureBrush(point);

  boardState.currentStroke = {
    tool: brush.tool,
    color: brush.color,
    strokeWidth: brush.strokeWidth,
    points: [point.x, point.y],
  };
  redrawBoard();
}

function stopDrawing(event) {
  const nativeEvent = event?.evt ?? event;

  if (!isDrawing || (nativeEvent?.pointerId !== undefined && nativeEvent.pointerId !== activePointerId)) {
    return;
  }

  if (boardState.currentStroke) {
    boardState.strokes.push(boardState.currentStroke);
    boardState.currentStroke = null;
  }

  isDrawing = false;
  activePointerId = null;
  redrawBoard();
}

function setBoardTool(tool) {
  state.boardTool = tool;

  document.querySelectorAll(".tool-button[data-tool]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === tool);
  });

  updateBoardInteractionMode();

  if (tool === "scroll") {
    stopDrawing();
  }
}

function updateBoardInteractionMode() {
  whiteboardCanvas.classList.toggle("is-scroll-mode", state.boardTool === "scroll");

  if (!boardStageInstance) {
    return;
  }

  const container = boardStageInstance.container();
  container.style.touchAction = state.boardTool === "scroll" ? "pan-x pan-y" : "none";
  container.style.cursor = state.boardTool === "scroll" ? "grab" : "crosshair";
}

function bindBoardStageEvents() {
  if (!boardStageInstance) {
    return;
  }

  boardStageInstance.on("pointerdown", (event) => {
    startDrawing(event);
    if (!shouldAcceptPointer(event.evt)) {
      warnNonPenInput();
    }
  });

  boardStageInstance.on("pointermove", (event) => {
    if (!isDrawing) {
      return;
    }

    if ((event.evt?.pointerId ?? "mouse") !== activePointerId) {
      return;
    }

    event.evt?.preventDefault();
    appendEventPointsToCurrentStroke(event);
    redrawBoard();
  });

  boardStageInstance.on("pointerup pointerleave pointercancel", stopDrawing);
}

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
  setWorkingFeedback(
    state.currentQuestion.workedSolution || `Final answer: ${state.currentQuestion.answer}.`,
    "is-success",
  );
  setStatus(`Worked solution shown. Final answer: ${state.currentQuestion.answer}.`, "is-success");
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
    resetBoard();
    setStatus("Whiteboard cleared.", "");
    return;
  }

  if (button.id === "checkBoardButton") {
    return;
  }

  setBoardTool(button.dataset.tool);
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
  setStatus("Gemini is checking your work...", "");

  try {
    const result = await analyseWhiteboardWithGemini();
    setWorkingFeedback(
      String(result.feedback || "Whiteboard checked."),
      result.hasError ? "is-error" : "is-success",
    );
    setStatus(
      result.hasError
        ? "Whiteboard checked. Gemini found a likely mistake in the work."
        : "Whiteboard checked. No clear mistake was found.",
      result.hasError ? "is-error" : "is-success",
    );
  } catch (error) {
    setStatus(getFriendlyWhiteboardErrorMessage(error), "is-error");
  } finally {
    setControlsDisabled(false);
  }
});

updateScoreboard();
resizeCanvas();
loadQuestion();
setStatus("Quick question ready. Gemini is used only when checking work or the whiteboard.", "");

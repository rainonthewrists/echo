let speechRec;
let phrases = [];
const recognitionDuration = 7000;
const fadeDuration = 50000;
const removalFadeDuration = 5000;
let frameSize = 100;
let occupiedAreas = [];
let recognitionTimeout;
let silenceTimeout;
let scenarioTimeout;
let currentScenario = 0;

function setup() {
  createCanvas(1920, 1080);
  background(0);
  
  speechRec = new p5.SpeechRec('ru-RU', gotSpeech);
  speechRec.interimResults = false;
  speechRec.continuous = true;
  speechRec.onEnd = handleEndOfRecognition;

  startRecognition();
  textSize(27);
  fill(255);
}

function draw() {
  background(0);
  
  for (let i = phrases.length - 1; i >= 0; i--) {
    let phrase = phrases[i];

    fill(255, 255, 255, phrase.alpha);
    if (phrase.type === 'speech') {
      textAlign(LEFT, CENTER);
    } else if (phrase.type === 'generated') {
      textAlign(RIGHT, CENTER);
    }
    
    // Ограничение на три строки
    const linesToDisplay = phrase.lines.slice(0, 7);
    
    for (let j = 0; j < linesToDisplay.length; j++) {
      text(linesToDisplay[j].toLowerCase(), phrase.x, phrase.y + j * 30);
    }

    if (phrases.length > 30 && i === 0) {
      phrase.alpha -= 255 / (removalFadeDuration / 1000 * frameRate());
      if (phrase.alpha <= 0) {
        occupiedAreas.splice(phrases[i].occupiedAreaIndex, 1);
        phrases.splice(i, 1);
        continue;
      }
    } else {
      phrase.alpha -= 178 / (fadeDuration / 1000 * frameRate());
      if (phrase.alpha <= 25) {
        phrase.alpha = 25;
      }
    }
  }
}

async function gotSpeech() {
  clearTimeout(silenceTimeout);
  clearTimeout(scenarioTimeout);
  currentScenario = 0;

  if (speechRec.resultValue) {
    let words = speechRec.resultString.split(' ');
    let groupedLines = splitIntoLines(words);

    let phraseObject = {
      lines: groupedLines,
      x: 0,
      y: 0,
      alpha: 255,
      type: 'speech',
      occupiedAreaIndex: null
    };

    findValidPosition(phraseObject);
    phrases.push(phraseObject);
    
    let generatedPoem = await requestPoem(speechRec.resultString);
    if (generatedPoem) {
      let poemWords = generatedPoem.split(' ');
      let poemLines = splitIntoLines(poemWords);

      let generatedPhraseObject = {
        lines: poemLines,
        x: 0,
        y: 0,
        alpha: 255,
        type: 'generated',
        occupiedAreaIndex: null
      };

      findValidPosition(generatedPhraseObject);
      phrases.push(generatedPhraseObject);
    }
    silenceTimeout = setTimeout(() => {
      startSilenceTimeout();
    }, 30000);
  }
}

function startSilenceTimeout() {
  scenarioTimeout = setInterval(generateRandomScenario, 10000);
}

function generateRandomScenario() {
  if (currentScenario === 0) {
    let generatedLines = [];
    let lineCount = Math.floor(Math.random() * 10) + 1;

    for (let i = 0; i < lineCount; i++) {
      let repeatCount = Math.floor(Math.random() * 4) + 1;
      generatedLines.push('01) '.repeat(repeatCount).trim());
    }

    let phraseObject = {
      lines: generatedLines,
      x: 0,
      y: 0,
      alpha: 255,
      type: 'generated',
      occupiedAreaIndex: null
    };

    findValidPosition(phraseObject);
    phrases.push(phraseObject);
    currentScenario = 1;
  } else if (currentScenario === 1) {
    const lines = [
      'let data = await',
      '(!response.ok)',
      'content: promptText',
      'async function',
      'handleEndOfRecognition()',
      'recognitionTimeout = setTimeout(()',
      'currentIndex += numWords',
      'validPositionFound = true',
      'phrases.push(phraseObject)',
      'currentScenario = 0',
      'lines: [randomLine]',
      'JSON.stringify(requestBody)'
    ];

    let randomLine = random(lines);
    let phraseObject = {
      lines: splitIntoLines(randomLine.split(' ')),
      x: 0,
      y: 0,
      alpha: 255,
      type: 'generated',
      occupiedAreaIndex: null
    };

    findValidPosition(phraseObject);
    phrases.push(phraseObject);
    currentScenario = 0;
  }
}

function findValidPosition(phraseObject) {
  let validPositionFound = false;
  let attempts = 0;

  while (!validPositionFound && attempts < 100) {
    let x = random(frameSize, width - frameSize);
    let y = random(frameSize, height - frameSize);

    if (!isPositionOccupied(x, y, phraseObject.lines.length)) {
      phraseObject.x = x;
      phraseObject.y = y;

      let area = { x, y, height: phraseObject.lines.length * 30 };
      occupiedAreas.push(area);
      phraseObject.occupiedAreaIndex = occupiedAreas.length - 1;

      validPositionFound = true;
    }

    attempts++;
  }
}

function isPositionOccupied(x, y, lineCount) {
  for (let area of occupiedAreas) {
    if (x < area.x + 100 && x + 100 > area.x &&
        y < area.y + area.height && y + lineCount * 20 > area.y) {
      return true;
    }
  }
  return false;
}

function splitIntoLines(words) {
  let groupedLines = [];
  let currentIndex = 0;

  while (currentIndex < words.length) {
    let numWords = Math.floor(Math.random() * 4) + 1;
    let lineWords = words.slice(currentIndex, currentIndex + numWords).join(' ');
    groupedLines.push(lineWords);
    currentIndex += numWords;
  }

  return groupedLines;
}

function startRecognition() {
  clearTimeout(recognitionTimeout);
  
  speechRec.start();

  recognitionTimeout = setTimeout(() => {
    speechRec.stop();
  }, recognitionDuration);
}

function handleEndOfRecognition() {
  startRecognition();
}

function keyPressed() {
  if (key === 'm' || key === 'M') {
    console.log('Перезапуск микрофона и распознавания речи');
    startRecognition();
  }
  if (key === 'f' || key === 'F') {
    toggleFullscreen();
  }
}

function toggleFullscreen() {
  let fs = fullscreen();
  fullscreen(!fs);
}

async function requestPoem(speech) {
  const apiKey = '3pqdV38WnPZ75Qo0aqhIKdDH4bpsSNV3';
  const apiUrl = 'https://api.mistral.ai/v1/chat/completions';

  const promptText = `Ответь одной поэтической строчкой. Поэзия на тему: "${speech}"`;

  const requestBody = {
    model: 'open-mistral-nemo',
    messages: [{ role: 'user', content: promptText }],
  };

  const requestOptions = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  };

  try {
    let response = await fetch(apiUrl, requestOptions);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    let data = await response.json();
    let generatedText = data?.choices[0]?.message?.content;

    if (generatedText) {
      return generatedText.replace(/[«»'"“”—.–:;,\n]/g, '').trim().toLowerCase();
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

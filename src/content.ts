// Create a counter variable to keep track of the position of the currently playing text
let currentIndex = 0;

// Listen for the "load" event on the window object
window.addEventListener("load", async (_event: Event) => {
  findResponseTextToSpeak();
});

// find and get response text to speak
async function findResponseTextToSpeak() {
  // Select all elements that you want to play
  const elements = document.querySelectorAll(
    ".bg-gray-50 > .text-base"
  ) as NodeListOf<HTMLElement>;
  console.log("find elements =>", elements.length);

  // Add the text from each element to the Map
  await elements.forEach(async (element, index) => {
    if (
      index >= currentIndex &&
      element.innerText != null &&
      element.innerText.length > 3
    ) {
      // only add the newer element into the map
      // only read text inside P elements, to exclude reading code
      const text = findParagraphTexts(element);
      console.log("find new text => ", text);

      // turn the text into speech
      await speakLang(text);
      // keep watching if text has been added new words
      await watchParagraphTextsToContinueSpeak(
        element,
        element.innerText.length,
        text
      );

      // Increment the counter variable to move to the next position in the Map
      currentIndex++;
    }
  });

  // wait 3 seconds to run again
  await sleep(3000);
  await findResponseTextToSpeak();
}

async function watchParagraphTextsToContinueSpeak(
  parentNode: HTMLElement,
  originalParentNodeInnerTextLength: number,
  originalText: string
) {
  // wait 1 secs
  await sleep(1000);

  const texts = findParagraphTexts(parentNode);
  const parentNodeInnerTextLength = parentNode.innerText.length;
  if (texts.length < originalText.length) {
    throw new Error("odd, the text length became shorter..");
  }

  if (
    texts.length > originalText.length ||
    parentNodeInnerTextLength > originalParentNodeInnerTextLength
  ) {
    // speak the added text
    const addedText = texts.slice(originalText.length - 1);
    await speakLang(addedText);
    // keep watching for texts change
    await watchParagraphTextsToContinueSpeak(
      parentNode,
      parentNodeInnerTextLength,
      texts
    );
  }
}

function findParagraphTexts(parentNode: HTMLElement): string {
  const pElements = parentNode.querySelectorAll(
    ":scope p"
  ) as NodeListOf<HTMLElement>;

  let text = "";
  for (let i = 0; i < pElements.length; i++) {
    text += pElements[i].innerText;
  }
  return text;
}

// utils functions
// below is all wrote by chatGPT
enum Language {
  Chinese = "chinese",
  English = "english",
  Unknown = "unknown",
}

function isEnglishOrChinese(texts: string): Language {
  // Use a regular expression to match Chinese characters
  const chineseRegex = /[\u4e00-\u9fff]/;

  // Use a regular expression to match English letters
  const englishRegex = /^[A-Za-z]+$/;

  // Count the number of Chinese characters and English letters
  // in the text
  let chineseCount = 0;
  let englishCount = 0;
  for (let i = 0; i < texts.length; i++) {
    if (chineseRegex.test(texts[i])) {
      chineseCount++;
    } else if (englishRegex.test(texts[i])) {
      englishCount++;
    }
  }

  // Check if the text contains more Chinese characters or
  // English letters
  if (chineseCount > englishCount) {
    // The text is written in Chinese
    return Language.Chinese;
  } else if (englishCount > chineseCount) {
    // The text is written in English
    return Language.English;
  } else {
    // The text contains an equal number of Chinese
    // characters and English letters
    return Language.Unknown;
  }
}

async function speakLang(texts: string) {
  // Use the isEnglishOrChinese() function to determine the
  // dominant language of the text
  const language = isEnglishOrChinese(texts);

  // Create a new SpeechSynthesisUtterance object
  let utterance = new SpeechSynthesisUtterance();

  // Set the text and language of the utterance based on the
  // dominant language of the text
  if (language === Language.Chinese) {
    utterance.text = texts;
    utterance.lang = "zh-CN";
  } else if (language === Language.English) {
    utterance.text = texts;
    utterance.lang = "en-US";
  } else {
    // The text is written in a mix of Chinese and English,
    // so we can't determine the dominant language
    console.log(
      "Unable to determine the dominant language of the text, can't speak"
    );
    return;
  }

  // Speak the text using the SpeechSynthesisUtterance API
  await speakAndWait(utterance);
}

// small helper functions
const speak = (utterance: SpeechSynthesisUtterance) => {
  const speechSynthesis = window.speechSynthesis;
  return new Promise((resolve, reject) => {
    speechSynthesis.speak(utterance);
    utterance.onend = resolve;
    utterance.onerror = reject;
  });
};

const speakAndWait = async (utterance: SpeechSynthesisUtterance) => {
  await speak(utterance);
};

const sleep = (milliseconds: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

/******** input sections *********/

// Listen for the "load" event on the window object
window.addEventListener("load", async (_event: Event) => {
  // insert a speaking icon
  const speakingIcon = insertSpeakingIcon();

  // ask for permission
  const isPermitted = await requestMicrophonePermission();
  insertMicrophoneIcon(isPermitted);

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    (window as any).mozSpeechRecognition ||
    (window as any).msSpeechRecognition ||
    (window as any).oSpeechRecognition;

  if (SpeechRecognition == null) {
    console.log("SpeechRecognition not supported!");
    return;
  }

  const triggerKeyCode = "ShiftRight";
  const recognition = new SpeechRecognition() as SpeechRecognition;
  let recognizing = false;
  recognition.onstart = function () {
    console.log("start recognizing!!");
    recognizing = true;
  };
  recognition.onend = function () {
    recognizing = false;
  };
  recognition.onerror = function (event) {
    recognizing = false;
  };

  const textareaElement: HTMLTextAreaElement | null = document.querySelector(
    "textarea.w-full.resize-none[data-id]"
  );
  if (textareaElement == null) {
    throw new Error("textareaElement is null");
  }
  const typingInTextArea = (text: string) => {
    let appendText = text;
    if (textareaElement.value != null && textareaElement.value != "") {
      // a simple workaround since we don't have auto-punctuation
      appendText = ", " + appendText;
    }
    textareaElement.value += appendText;
  };

  // Listen for keyup events on the document
  document.addEventListener("keyup", (event: KeyboardEvent) => {
    // Check if the released key is the space bar
    if (event.code === triggerKeyCode) {
      // If it is, log a message to the console
      console.log("Space key release detected");
      hideIcon(speakingIcon);
      stopDictation(recognition);
    }
  });

  // Listen for keypress events on the document
  document.addEventListener("keydown", (event: KeyboardEvent) => {
    // Check if the held key is the space bar
    if (event.code === triggerKeyCode) {
      if (!recognizing) {
        // If it is, log a message to the console
        console.log("Space key hold detected");
        showIcon(speakingIcon);
        startDictation(recognition, typingInTextArea);
      }
    }
  });
});

// Define a type for the keydown, keyup, and keypress event handlers
type KeyEventHandler = (event: KeyboardEvent) => void;

async function startDictation(
  recognition: SpeechRecognition,
  callback?: (text: string) => any
) {
  try {
    // If permission is granted, start listening for speech input
    recognition.start();

    // When speech is detected, transcribe it into text
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0][0];

      // Check if the result is a final result
      if (result.confidence > 0.5) {
        // Get the transcript of the recognized speech
        const transcript = result.transcript;
        console.log("transcript: ", transcript);

        if (callback) {
          // Do something with the transcribed text, such as typing it into a text input box
          callback(transcript);
        }
      }
    };
  } catch (error) {
    // Handle any other errors or exceptions that might occur
    throw error;
  }
}

async function stopDictation(recognition: SpeechRecognition) {
  // Stop listening for speech input
  recognition.stop();
}

async function requestMicrophonePermission(): Promise<boolean> {
  const permission: PermissionStatus = await navigator.permissions.query({
    name: "microphone" as PermissionName,
  });

  if (permission.state === "granted") {
    return true;
  } else {
    navigator.mediaDevices
      .getUserMedia({ video: false, audio: true })
      .then((stream) => {
        (window as any).localStream = stream;
        (window as any).localAudio.srcObject = stream;
        (window as any).localAudio.autoplay = true;
      })
      .catch((err) => {
        console.error(`getUserMedia got an error: ${err}`);
      });
    return new Promise((resolve) => {
      // Set the event handler for the change event
      permission.onchange = () => {
        // Resolve the promise with the current state of the permission
        resolve(permission.state === "granted");
      };
    });
  }
}

function insertSpeakingIcon() {
  const icon = document.createElement("h1");
  icon.innerText = "Speaking..";
  document.body.appendChild(icon);

  // Place the icon in the top-right corner of the page
  icon.style.position = "absolute";
  icon.style.top = "0";
  icon.style.right = "0";
  icon.style.color = "green";

  // Hide the icon by default
  icon.style.display = "none";
  return icon;
}

function insertMicrophoneIcon(isPermitted: boolean) {
  const icon = document.createElement("div");
  document.body.appendChild(icon);

  // Place the icon in the top-right corner of the page
  icon.style.position = "absolute";
  icon.style.top = "0";
  icon.style.right = "0";

  // Hide the icon by default
  if (isPermitted) {
    icon.innerText = "mic ☑️";
    icon.style.color = "green";
  } else {
    icon.innerText = "mic ✖️";
    icon.style.color = "red";
  }
  return icon;
}

function showIcon(icon: HTMLElement) {
  icon.style.display = "block";
}

function hideIcon(icon: HTMLElement) {
  icon.style.display = "none";
}

/******** output sections *********/
// Create a counter variable to keep track of the position of the currently playing text
let currentIndex = 0;

// Listen for the "load" event on the window object
window.addEventListener("load", async (_event: Event) => {
  await findResponseTextToSpeak();
});

// find and get response text to speak
async function findResponseTextToSpeak() {
  // Select all elements that you want to play
  const parentNode = document.querySelectorAll(
    ".bg-gray-50 > .text-base"
  ) as NodeListOf<HTMLElement>;
  console.log("find elements =>", parentNode.length);

  for (let index = 0; index < parentNode.length; index++) {
    const element = parentNode[index];

    // only add the newer element into the speaking
    if (
      index >= currentIndex &&
      element.innerText != null &&
      element.innerText.length > 3
    ) {
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
  }

  // wait 1000 milsecs to run again
  await sleep(1000);
  await findResponseTextToSpeak();
}

async function watchParagraphTextsToContinueSpeak(
  parentNode: HTMLElement,
  originalParentNodeInnerTextLength: number,
  originalText: string
) {
  // wait 100 milsecs
  await sleep(100);

  const texts = findParagraphTexts(parentNode);
  const parentNodeInnerTextLength = parentNode.innerText.length;
  if (texts.length < originalText.length) {
    console.error(
      "[chatGPT-auto-speech] the text length became shorter..abort"
    );
    return;
  }

  if (
    texts.length > originalText.length ||
    parentNodeInnerTextLength > originalParentNodeInnerTextLength
  ) {
    // speak the added text if any
    if (texts.length > originalText.length) {
      const addedText = texts.slice(originalText.length);
      console.log("added text =>", addedText);
      await speakLang(addedText);
    }

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

  const voice = findCorrectVoice(language);
  if (voice != null) {
    utterance.voice = voice;
  }

  // tune speaking speed
  utterance.rate = 1.1; // a little faster than normal

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

const findCorrectVoice = (lang: Language) => {
  const speechSynthesis = window.speechSynthesis;
  if (lang == Language.Chinese) {
    const voices = speechSynthesis
      .getVoices()
      .filter((voice) => voice.name === "Ting-Ting" && voice.lang === "zh-CN");
    if (voices.length > 0) {
      return voices[0];
    }
  } else if (lang == Language.English) {
    const voices = speechSynthesis
      .getVoices()
      .filter((voice) => voice.name === "Alex" && voice.lang === "en-US");
    if (voices.length > 0) {
      return voices[0];
    }
  }

  return null;
};

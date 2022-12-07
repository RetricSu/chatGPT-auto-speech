// Listen for the "load" event on the window object
window.addEventListener('load', () => {
  // Inject the "Listen" button into the page using the Chrome Extension API
  // Create the "Listen" button
  const button = document.createElement('button');
  button.id = 'listen-button';
  button.textContent = 'Listen';

  // Set the width and height of the button to 100 pixels
  button.style.width = '80px';
  button.style.height = '20px';

  // Set the background color of the button to blue
  button.style.backgroundColor = 'blue';
  button.style.opacity = 0.5;

  // Position the button in the center of the page using the left and top properties
  button.style.position = 'fixed';
  button.style.left = '50%';
  button.style.top = '50%';
  button.style.display = 'none';

  // Add an animation to the button when it is clicked
  button.style.animation = 'fade 0.5s';

  // Add the button to the page using the document.add method
  document.body.appendChild(button);

  // Create a Map to save the text from each element
  const textMap = new Map();
  // Create a counter variable to keep track of the position of the currently playing text
  let currentIndex = 0;

  // Function to play the next text in the Map
  function playNext() {
    // Get the text at the current position in the Map
    const text = textMap.get(currentIndex);

    if(text == null || text.length < 3){
      console.log("no text, skip..");
      return;
    }

    // If the end of the Map has been reached, return 
    if (currentIndex >= textMap.size) {
      console.log("already spoke...")
      return;
    }
  
    // Create a new SpeechSynthesisUtterance with the text
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
  
    // Increment the counter variable to move to the next position in the Map
    currentIndex++;

    console.log(text, currentIndex);
  }

  // Listen for clicks on the "Listen" button
  document.querySelector('#listen-button').addEventListener('click', () => { 
    // Select all elements that you want to play
    const elements = document.querySelectorAll('.bg-gray-50 > .text-base');
    console.log("find elements =>", elements.length);
    // Add the text from each element to the Map
    elements.forEach((element, index) => {
      if(index >= currentIndex && element.innerText != null && element.innerText.length > 3){// only add the newer element into the map
        console.log("add new text, ", element.innerText);
        textMap.set(index, element.innerText);
      }
    });
    playNext(); 
  });

  // click this button every 5 seconds
  function clickButton() {
    // Use the dispatchEvent() method to trigger a click event on the button
    button.dispatchEvent(new Event("click"));
  }


  // Use the setInterval() method to execute the clickButton() function every 5 seconds
  setInterval(clickButton, 5000);
});




const conversationDiv = document.getElementById('conversation');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

let lastUserInput = '';

/// sendMessage function
function sendMessage() {
    const text = userInput.value;
    userInput.value = '';

    lastUserInput = text;

    const userMessage = document.createElement('div');
    userMessage.className = 'user-message';
    userMessage.textContent = `Deg: ${text}`;
    conversationDiv.appendChild(userMessage);

    // Create the "typing" element
    const typing = document.createElement('div');
    typing.className = 'bot-message';
    typing.innerHTML = '<span class="typing-wrapper"><span class="typing-text">PorteføljeBot skriver et svar</span><span class="typing-dots">...</span></span>';

    // Append the "typing" element to the conversation
    conversationDiv.appendChild(typing);



    // Disable the input field and the send button
    userInput.disabled = true;
    sendButton.disabled = true;

    // Send the message to the server
    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
    }).then(response => response.json()).then(data => {
        const botMessage = document.createElement('div');
        botMessage.className = 'bot-message';
    
        // Check if all questions have been answered
        if (data.text === 'No more questions.') {
            // If all questions have been answered, make a POST request to the '/generate-summary' route
            fetch('/generate-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(response => response.json()).then(summaryData => {
                // Display the summary in a different way
                botMessage.innerHTML = `PorteføljeBot: <pre>${summaryData.text}</pre>`;
            }).catch(error => {
                console.error('Error:', error);
            });
        } else {
            // If not all questions have been answered, continue the conversation as usual
            if (data.text.includes('Saksframlegg')) {
                // If the bot's response contains the document, display it in a different way
                botMessage.innerHTML = `PorteføljeBot: <pre>${data.text}</pre>`;
            } else {
                botMessage.textContent = `PorteføljeBot: ${data.text}`;
            }
        }
    
        conversationDiv.appendChild(botMessage);
    
        // Scroll the chat window to the bottom
        conversationDiv.scrollTop = conversationDiv.scrollHeight;
    
        // Remove the "typing" element from the conversation
        conversationDiv.removeChild(typing);
    
        // Re-enable the input field and the send button
        userInput.disabled = false;
        sendButton.disabled = false;
    
    }).catch(error => {
        console.error('Error:', error);
    
        // Remove the "typing" element from the conversation in case of error
        if (conversationDiv.contains(typing)) {
            conversationDiv.removeChild(typing);
        }
    
        // Re-enable the input field and the send button, even in case of error
        userInput.disabled = false;
        sendButton.disabled = false;
    });
}


// Event listener for the send button
sendButton.addEventListener('click', sendMessage);

// Event listener for the "Enter" key in the text input field
userInput.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) {
        // Cancel the default action
        event.preventDefault();
        sendMessage();
    }
});

const restartButton = document.getElementById('restart-button');

restartButton.addEventListener('click', restartConversation);

function restartConversation() {

    // Clear the conversation div
    conversationDiv.innerHTML = '';

    // Clear the conversation array
    conversation = [];

    // Reset the current question index
    currentQuestionIndex = 0;

    // Make a request to the /restart endpoint to reset the session data
    fetch('/restart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => {
        if (response.ok) {
            // Optionally, start the conversation again by sending a welcome message or the first question
            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'bot-message';
            welcomeMessage.textContent = `Chatbot: ${questions[currentQuestionIndex].question}`;
            conversationDiv.appendChild(welcomeMessage);
        } else {
            console.error('Failed to restart the conversation');
        }
    }).catch(error => {
        console.error('Error:', error);
    });
}



document.getElementById('download-button').addEventListener('click', function() {
    var element = document.getElementById('document-container');
    var opt = {
        margin:       1,
        filename:     'document.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'A4', orientation: 'portrait' }
    };

    // New Promise-based usage:
    html2pdf().set(opt).from(element).save();
});

function sendWelcomeMessage() {
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'bot-message';
    welcomeMessage.textContent = `PorteføljeBot: Hei! Jeg er PorteføljeBot. Jeg er her for å hjelpe deg med å utforme og samle inn informasjon om ideer som kan bli til prosjekter. Beggyn med og fotelle meg om idèen din.`;
    conversationDiv.appendChild(welcomeMessage);
}

// Event listener for the regenerate button
document.getElementById('regenerate-button').addEventListener('click', function() {
    // Remove the last bot message
    const botMessages = document.getElementsByClassName('bot-message');
    if (botMessages.length > 0) {
        const lastBotMessage = botMessages[botMessages.length - 1];
        conversationDiv.removeChild(lastBotMessage);
    }

    // Add a "typing" message
    const typing = document.createElement('div');
    typing.id = 'typing';
    typing.innerHTML = '<span class="bot-message">PorteføljeBot skriver et svar</span><span class="typing-dots">...</span>';
    conversationDiv.appendChild(typing);

    fetch('/regenerate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: lastUserInput })
    }).then(response => response.json()).then(data => {
        // Remove the "typing" message
        if (conversationDiv.contains(typing)) {
            conversationDiv.removeChild(typing);
        }

        // Update the chat interface with the new bot response
        const botMessage = document.createElement('div');
        botMessage.className = 'bot-message';
        botMessage.textContent = `PorteføljeBot: ${data.text}`;
        conversationDiv.appendChild(botMessage);
    }).catch(error => {
        console.error('Error:', error);
    });
});


window.onload = sendWelcomeMessage;



const conversationDiv = document.getElementById('conversation');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// sendMessage function
function sendMessage() {
    const text = userInput.value;
    userInput.value = '';

    const userMessage = document.createElement('div');
    userMessage.className = 'user-message';
    userMessage.textContent = `Deg: ${text}`;
    conversationDiv.appendChild(userMessage);

    // Create the "typing" element
    const typing = document.createElement('div');
    typing.id = 'typing';
    typing.innerHTML = '<span class="bot-message">PorteføljeBot skriver et svar</span><span class="typing-dots">...</span>';

    // Append the "typing" element to the conversation
    conversationDiv.appendChild(typing);

    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
    }).then(response => response.json()).then(data => {
        const botMessage = document.createElement('div');
        botMessage.className = 'bot-message';
        botMessage.textContent = `PorteføljeBot: ${data.text}`;
        conversationDiv.appendChild(botMessage);

        // Scroll the chat window to the bottom
        conversationDiv.scrollTop = conversationDiv.scrollHeight;

        // Remove the "typing" element from the conversation
        conversationDiv.removeChild(typing);

        // Update the document only if the response contains the professional summary
        if (data.text.includes('Takk for at du svarte på alle spørsmålene.')) {
            const documentContainer = document.getElementById('document-container');
            const paragraph = document.createElement('p');
            paragraph.textContent = data.text;
            documentContainer.appendChild(paragraph);
        }
    }).catch(error => {
        console.error('Error:', error);

        // Remove the "typing" element from the conversation in case of error
        conversationDiv.removeChild(typing);
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


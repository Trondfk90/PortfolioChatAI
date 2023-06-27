const conversationDiv = document.getElementById('conversation');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// sendMessage function
function sendMessage() {
    const text = userInput.value;
    userInput.value = '';

    const userMessage = document.createElement('div');
    userMessage.className = 'user-message';
    userMessage.textContent = `You: ${text}`;
    conversationDiv.appendChild(userMessage);

    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
    }).then(response => response.json()).then(data => {
        const botMessage = document.createElement('div');
        botMessage.className = 'bot-message';
        botMessage.textContent = `Chatbot: ${data.text}`;
        conversationDiv.appendChild(botMessage);
        conversationDiv.scrollTop = conversationDiv.scrollHeight;

        // Update the document
        const documentContainer = document.getElementById('document-container');
        const paragraph = document.createElement('p');
        paragraph.textContent = data.text;
        documentContainer.appendChild(paragraph);
    }).catch(error => {
        console.error('Error:', error);
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

document.getElementById('download-button').addEventListener('click', function() {
    var element = document.getElementById('document-container');
    var opt = {
        margin:       1,
        filename:     'document.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // New Promise-based usage:
    html2pdf().set(opt).from(element).save();
});


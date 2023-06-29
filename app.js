//Dependencies
const express = require('express');
require('dotenv').config();
const { Configuration } = require("openai");
const questions = require('./questions');
const session = require('express-session');
const crypto = require('crypto');

// Langchain imports
const { DirectoryLoader } = require("langchain/document_loaders/fs/directory");
const { JSONLoader, JSONLinesLoader } = require("langchain/document_loaders/fs/json");
const { TextLoader } = require("langchain/document_loaders/fs/text");
const { CSVLoader } = require("langchain/document_loaders/fs/csv");
const { PDFLoader } = require("langchain/document_loaders/fs/pdf");

// Import OpenAI from Langchain
const { OpenAI } = require("langchain/llms/openai");
const { BufferMemory } = require("langchain/memory");
const { ConversationChain } = require("langchain/chains");

const secret = crypto.randomBytes(64).toString('hex');
const app = express();
app.use(session({
  secret: process.env.SESSION_SECRET || secret,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // set to true if app is https
}));

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY || app.settings.OPENAI_API_KEY,
});

app.use(express.json()); 
app.use(express.static('public'));

// Load documents 
let docs;
const loader = new DirectoryLoader("./documents", {
  ".json": (path) => new JSONLoader(path, "/texts"),
  ".jsonl": (path) => new JSONLinesLoader(path, "/html"),
  ".txt": (path) => new TextLoader(path),
  ".csv": (path) => new CSVLoader(path, "text"),
  ".pdf": (path) => new PDFLoader(path, { splitPages: false }),
});
loader.load().then((documents) => { 
  docs = documents;
  console.log({ docs });

  // Create a new instance of ChatOpenAI
  const memory = new BufferMemory();
  const chat = new ConversationChain({
    llm: new OpenAI({}),
    memory: memory,
    documents: docs
  });

  app.post('/chat', async (req, res) => {
    const userInput = req.body.text;

    // Initialize the current question index, conversation history, and summary presented flag if they're undefined
    if (req.session.currentQuestionIndex === undefined) {
      console.log('A new session has been created.');

      req.session.currentQuestionIndex = 0;
      req.session.conversation = [
        'system: Du er en hjelpsom assistent. Oppgaven din er å stille brukeren spørsmålene fra listen, ett etter ett, og formulere svar basert på brukerens svar. Ikke generer noen ekstra spørsmål eller kommentarer.'
      ];      
      req.session.summaryPresented = false;
  }
// Get the current question and rule
const currentQuestion = questions[req.session.currentQuestionIndex];
if (!currentQuestion) {
  res.status(400).json({ error: 'No more questions.' });
  return;
}

// Add the current question, rule, and user input to the conversation history
req.session.conversation.push(
  currentQuestion.question,
  currentQuestion.rule,
  userInput
);

// Define a maximum number of messages to keep in the conversation history
const MAX_HISTORY_LENGTH = 10;

// If the conversation history is too long, remove the oldest messages
while (req.session.conversation.length > MAX_HISTORY_LENGTH) {
  req.session.conversation.shift();
}

// Generate chatbot response
try {
  let input = req.session.conversation.join('\n');
  if (!input.includes(currentQuestion.question)) {
    input += '\n' + currentQuestion.question;
  }

  const response = await chat.call({ input });

  // Extract the bot's reply
  let botReply = response.response;

  // If there are no more questions, generate a summary
  if (req.session.currentQuestionIndex >= questions.length - 1) {
    // Generate the summary only once, when all questions have been answered
    if (!req.session.summaryPresented) {
      const nextQuestion = questions[req.session.currentQuestionIndex + 1]?.question;

      // Add the bot's reply and the next question to the conversation history
      req.session.conversation.push(botReply, nextQuestion);

      // Check if this is the first time the summary is being presented
      if (!req.session.summaryPresented) {
        // Mark the summary as presented
        req.session.summaryPresented = true;

        // Generate the document
        const document = `Saksframlegg\n\nKort oppsummering:\n(TBD)\n\nKonklusjon:\n(TBD)\n\nSaksvurdering:\n${req.session.conversation.join('\n')}\n\nVirksomhetsstrategi som støtter forslaget:\n(TBD)`;

        // Generate the summary by making the API call
        const summary = await chat.call({
          input: [
            ...req.session.conversation,
            'Generate a summary of the conversation.'
          ].join('\n')
        });

        const summaryReply = summary.response;

        // Update the document with the actual summary
        const updatedDocument = document.replace('(TBD)', summaryReply);

        // Send the bot's response, the next question, and the updated document to the user
        res.json({ text: botReply + ' ' + nextQuestion + '\n\n' + updatedDocument + '\n\nDette er oppsummeringen av svarene dine. Vil du legge til eller fjerne noe?' });
        return; // Return after sending the response to avoid further execution
      }
    }
  }

  // Get the next question
  const nextQuestion = questions[req.session.currentQuestionIndex + 1]?.question;

  // Add the bot's reply and the next question to the conversation history
  req.session.conversation.push(botReply, nextQuestion);

  // Increment the current question index
  req.session.currentQuestionIndex++;

  // Send the bot's response and the next question to the user
  res.json({ text: botReply + ' ' + nextQuestion });
} catch (error) {
  console.error(error);
  console.error(error.message);
  res.status(500).json({ error: 'An error occurred while generating a response.' });
}

  });

    //Regenerate response
    app.post('/regenerate', async (req, res) => {
      const userInput = req.body.text;
      const response = await chat.call({ input: userInput });
      const botReply = response.response;
      res.json({ text: botReply });
  });

  app.post('/restart', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'An error occurred while restarting the conversation.' });
      } else {
        res.json({ message: 'Conversation restarted.' });
      }
    });
  });
  
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
  
  }).catch((error) => {
    console.error('Error loading documents:', error);
  });

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
  cookie: { secure: false } // set to true if app is on https
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

    try {
      // Initialize the current question index, conversation history, and summary presented flag if they're undefined
      if (req.session.currentQuestionIndex === undefined) {
        console.log('A new session has been created.');

        req.session.currentQuestionIndex = 0;
        req.session.conversation = [
          "Hei! Jeg er PorteføljeBot, laget av Vestland fylkeskommune. Jeg er her for å hjelpe deg med å utforme og samle inn informasjon om ideer som kan bli til prosjekter. Hvordan kan jeg assistere deg i dag?"
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

      // Generate chatbot response
      const response = await chat.call({
        input: req.session.conversation.join('\n') + '\n' + currentQuestion.question
      });

      // Extract the bot's reply
      const botReply = response.response;

      // If there are no more questions, generate a summary
      if (req.session.currentQuestionIndex >= questions.length - 1) {
        const summary = await chat.call({
          input: [
            ...req.session.conversation,
            "Generate a summary of the conversation."
          ].join('\n')
        });

        const summaryReply = summary.response;

        // Check if this is the first time the summary is being presented
        if (!req.session.summaryPresented) {
          // Mark the summary as presented
          req.session.summaryPresented = true;

          // Send the summary to the user and ask for any changes
          res.json({ text: botReply + ' ' + summaryReply + ' Dette er oppsummeringen av svarene dine. Vil du legge til eller fjerne noe?' });
        } else {
          // Append the user's changes to the summary
          const revisedSummary = summaryReply + ' ' + userInput;

          // Send the revised summary to the user
          res.json({ text: botReply + ' ' + revisedSummary + ' Takk for at du svarte på alle spørsmålene. Er det noe mer du vil legge til?' });
        }
      } else {
        // Get the next question
        const nextQuestion = questions[req.session.currentQuestionIndex + 1].question;

        // Add the bot's reply and the next question to the conversation history
        req.session.conversation.push(botReply, nextQuestion);

        // Increment the current question index
        req.session.currentQuestionIndex++;

        // Send the bot's response and the next question
        res.json({ text: botReply + ' ' + nextQuestion });
      }
    } catch (error) {
      console.error(error);
      console.error(error.message);
      res.status(500).json({ error: 'An error occurred while generating a response.' });
    }
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

// Route for regenerating the response
app.post('/regenerate', async (req, res) => {
  try {
    const response = await chat.call({ 
      input: req.session.conversation.join('\n')
    });

    const botReply = response.response;

    res.json({ text: botReply });
  } catch (error) {
    console.error(error);
    console.error(error.message);
    res.status(500).json({ error: 'An error occurred while regenerating the response.' });
  }
});

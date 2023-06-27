const express = require('express');
require('dotenv').config();
const { Configuration, OpenAIApi } = require("openai");
const questions = require('./questions');

const app = express();
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY || app.settings.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.use(express.json()); 
app.use(express.static('public'));

let currentQuestionIndex = 0;

app.post('/chat', async (req, res) => {
  const userInput = req.body.text;

  // If there are no more questions, send a completion message
  if (currentQuestionIndex >= questions.length) {
    res.json({ text: 'Takk for at du svarte på alle spørsmålene, er det noe mer du vil legge til?' });
    return;
  }

  // Get the current question and rule
  const currentQuestion = questions[currentQuestionIndex].question;
  const currentRule = questions[currentQuestionIndex].rule;

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: currentQuestion
        },
        {
          role: "user",
          content: userInput
        }
      ]
    });

    const chatbotResponse = response.data.choices[0].message.content.trim();

    // If the user's response follows the rule, move to the next question
    currentQuestionIndex++;

    // If there are no more questions, send a completion message
    if (currentQuestionIndex >= questions.length) {
      res.json({ text: chatbotResponse + ' Takk for at du svarte på alle spørsmålene.' });
    } else {
      // Otherwise, send the chatbot's response and the next question
      res.json({ text: chatbotResponse + ' ' + questions[currentQuestionIndex].question });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while generating a response.' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});


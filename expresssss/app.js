const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Načtení anket
const surveys = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'surveys.json'))
);

// Domovská stránka
app.get('/', (req, res) => {
    res.render('index', { surveys });
});

// Zobrazení konkrétní ankety
app.get('/survey/:id', (req, res) => {
    const survey = surveys.find(s => s.id == req.params.id);

    if (!survey) {
        return res.send('Anketa nebyla nalezena');
    }

    res.render('survey', { survey });
});

// Odeslání odpovědí
app.post('/survey/:id', (req, res) => {
    const surveyId = parseInt(req.params.id);

    const response = {
        surveyId,
        answers: req.body,
        timestamp: new Date()
    };

    const responsesPath = path.join(__dirname, 'responses.json');

    let responses = [];

    if (fs.existsSync(responsesPath)) {
        responses = JSON.parse(fs.readFileSync(responsesPath));
    }

    responses.push(response);

    fs.writeFileSync(
        responsesPath,
        JSON.stringify(responses, null, 2)
    );

    res.redirect(`/results/${surveyId}`);
});

// Výsledky ankety
app.get('/results/:id', (req, res) => {
    const surveyId = parseInt(req.params.id);

    const survey = surveys.find(s => s.id === surveyId);

    if (!survey) {
        return res.send('Anketa nebyla nalezena');
    }

    const responses = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'responses.json'))
    );

    const surveyResponses = responses.filter(
        r => r.surveyId === surveyId
    );

    const stats = {};

    survey.questions.forEach(question => {

        if (question.type === 'closed') {

            stats[question.id] = {};

            question.options.forEach(option => {
                stats[question.id][option] = 0;
            });

            surveyResponses.forEach(response => {
                const answer = response.answers[question.id];

                if (stats[question.id][answer] !== undefined) {
                    stats[question.id][answer]++;
                }
            });
        }
        else {
            stats[question.id] = [];

            surveyResponses.forEach(response => {
                if (response.answers[question.id]) {
                    stats[question.id].push(
                        response.answers[question.id]
                    );
                }
            });
        }
    });

    res.render('results', {
        survey,
        stats,
        totalResponses: surveyResponses.length
    });
});

app.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});
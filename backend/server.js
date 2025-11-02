const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// -------------------- MIDDLEWARE --------------------
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// -------------------- ROUTES API --------------------
// DOIVENT être avant les fichiers statiques
const reservationRoutes = require('./routes/reservation');
const contactRoutes = require('./routes/contact');

app.use('/api/reservations', reservationRoutes);
app.use('/api/contacts', contactRoutes);

// Route test API
app.get('/api', (req, res) => {
    res.json({ 
        message: 'API MonChauffeur 2.0 fonctionne !',
        status: 'OK',
        timestamp: new Date()
    });
});

// -------------------- FRONTEND --------------------
const frontendPath = path.join(__dirname, '../frontend');
console.log('📁 Chemin frontend:', frontendPath);

// Servir les fichiers statiques du frontend
app.use(express.static(frontendPath));

// Route catch-all pour SPA (tout sauf /api)
app.get(/^(?!\/api).*/, (req, res) => {
    const monchauffeurPath = path.join(frontendPath, 'monchauffeur.html');
    console.log('📄 Tentative de chargement:', monchauffeurPath);
    res.sendFile(monchauffeurPath, (err) => {
        if (err) {
            console.error('❌ Erreur chargement monchauffeur.html:', err);
            res.status(500).send('Erreur de chargement de la page');
        }
    });
});

// -------------------- GESTION DES ERREURS --------------------
app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Une erreur est survenue sur le serveur'
    });
});

// -------------------- LANCEMENT DU SERVEUR --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📁 Frontend: ${frontendPath}`);
});

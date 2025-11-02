const express = require('express');
const router = express.Router();
const db = require('../config/database');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Assure-toi que les variables .env sont chargées

// --- Configuration du transporteur d'e-mail ---
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // false pour le port 587 (TLS)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

// --- Vérifier la connexion SMTP au démarrage ---
transporter.verify((error, success) => {
    if (error) {
        console.error('Erreur SMTP:', error);
    } else {
        console.log('Serveur mail prêt à envoyer des messages ✔️');
    }
});

// --- Route POST pour le formulaire de contact ---
router.post('/', async (req, res) => {
    try {
        const { contactNom, contactEmail, contactTelephone, contactSujet, contactMessage } = req.body;

        // 1️⃣ Enregistrement dans la base
        const [result] = await db.execute(
            'INSERT INTO contacts (nom, email, telephone, sujet, message) VALUES (?, ?, ?, ?, ?)',
            [contactNom, contactEmail, contactTelephone, contactSujet, contactMessage]
        );

        // 2️⃣ Envoi d’un e-mail de confirmation au client
        await transporter.sendMail({
            from: `"MonChauffeur 2.0" <${process.env.EMAIL_USER}>`,
            to: contactEmail,
            subject: 'Message reçu - MonChauffeur 2.0',
            html: `
                <h2>Merci pour votre message !</h2>
                <p>Bonjour <strong>${contactNom}</strong>,</p>
                <p>Nous avons bien reçu votre message concernant : <strong>${contactSujet}</strong></p>
                <p>Notre équipe vous répondra dans les plus brefs délais.</p>
                <p>Cordialement,<br>L'équipe MonChauffeur 2.0</p>
            `
        });

        // 3️⃣ Envoi d’un e-mail à l’administrateur
        await transporter.sendMail({
            from: `"Formulaire MonChauffeur 2.0" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Admin reçoit ici
            subject: `📩 Nouveau message : ${contactSujet}`,
            html: `
                <h2>Nouveau message reçu</h2>
                <p><strong>Nom :</strong> ${contactNom}</p>
                <p><strong>Email :</strong> ${contactEmail}</p>
                <p><strong>Téléphone :</strong> ${contactTelephone || 'Non fourni'}</p>
                <p><strong>Sujet :</strong> ${contactSujet}</p>
                <p><strong>Message :</strong><br>${contactMessage}</p>
            `
        });

        // 4️⃣ Réponse au frontend
        res.status(201).json({
            success: true,
            message: 'Message envoyé avec succès !'
        });

    } catch (error) {
        console.error('Erreur lors de l’envoi du mail:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l’envoi du message.'
        });
    }
});

module.exports = router;

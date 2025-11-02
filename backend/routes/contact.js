const express = require('express');
const router = express.Router();
const db = require('../config/database');
require('dotenv').config(); // Assure-toi que les variables .env sont chargées

// --- Resend (API HTTP) uniquement ---
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || `"MonChauffeur 2.0" <${process.env.EMAIL_USER}>`;

async function sendViaResend(to, subject, html, replyTo) {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY non défini');
    const body = {
        from: EMAIL_FROM,
        to,
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {})
    };
    const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Resend API error ${resp.status}: ${txt}`);
    }
    return resp.json();
}

// Pas de vérification SMTP: Resend API ne nécessite pas de handshake au démarrage

// --- Route POST pour le formulaire de contact ---
router.post('/', async (req, res) => {
    try {
        const { contactNom, contactEmail, contactTelephone, contactSujet, contactMessage } = req.body;

        // 1️⃣ Enregistrement dans la base
        const [result] = await db.execute(
            'INSERT INTO contacts (nom, email, telephone, sujet, message) VALUES (?, ?, ?, ?, ?)',
            [contactNom, contactEmail, contactTelephone, contactSujet, contactMessage]
        );

        // 2️⃣ Envoi d’un e-mail de confirmation au client via Resend API
        await sendViaResend(
            contactEmail,
            'Message reçu - MonChauffeur 2.0',
            `
                <h2>Merci pour votre message !</h2>
                <p>Bonjour <strong>${contactNom}</strong>,</p>
                <p>Nous avons bien reçu votre message concernant : <strong>${contactSujet}</strong></p>
                <p>Notre équipe vous répondra dans les plus brefs délais.</p>
                <p>Cordialement,<br>L'équipe MonChauffeur 2.0</p>
            `,
            contactEmail
        );

        // 3️⃣ Envoi d’un e-mail à l’administrateur via Resend API
        await sendViaResend(
            process.env.EMAIL_USER,
            `📩 Nouveau message : ${contactSujet}`,
            `
                <h2>Nouveau message reçu</h2>
                <p><strong>Nom :</strong> ${contactNom}</p>
                <p><strong>Email :</strong> ${contactEmail}</p>
                <p><strong>Téléphone :</strong> ${contactTelephone || 'Non fourni'}</p>
                <p><strong>Sujet :</strong> ${contactSujet}</p>
                <p><strong>Message :</strong><br>${contactMessage}</p>
            `
        );

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

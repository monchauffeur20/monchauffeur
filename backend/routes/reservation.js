const express = require('express');
const router = express.Router();
const db = require('../config/database');
const nodemailer = require('nodemailer');
require('dotenv').config();

// -------------------- CONFIG EMAIL --------------------
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true' || String(process.env.EMAIL_PORT) === '465';
const transporter = EMAIL_ENABLED ? nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: EMAIL_SECURE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    connectionTimeout: 15000,
    socketTimeout: 20000,
    tls: { rejectUnauthorized: false }
}) : null;
const FROM = process.env.EMAIL_FROM || `"MonChauffeur 2.0" <${process.env.EMAIL_USER}>`;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendViaResend(to, subject, html, replyTo) {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY non défini');
    const body = {
        from: FROM,
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

// -------------------- ROUTE POST /api/reservations --------------------
router.post('/', async (req, res) => {
    try {
        const {
            nom, telephone, email, date, heure, depart, arrivee,
            vehicule, passagers, typeService, details
        } = req.body;

        if (!nom || !telephone || !email || !date || !heure || !depart || !arrivee) {
            return res.status(400).json({
                success: false,
                message: 'Certains champs obligatoires sont manquants.'
            });
        }

        // 1️⃣ Enregistrement dans la base
        const [result] = await db.execute(
            `INSERT INTO reservations 
            (nom, telephone, email, date_service, heure_service, 
             adresse_depart, adresse_arrivee, type_vehicule, 
             nombre_passagers, type_service, details) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nom, telephone, email, date, heure, depart, arrivee, 
             vehicule, passagers, typeService, details]
        );

        // 2️⃣ Envoi email au client
        const mailClient = {
            from: FROM,
            to: email,
            subject: '✅ Confirmation de réservation - MonChauffeur 2.0',
            replyTo: email,
            html: `
                <div style="font-family: Arial; padding: 20px; background: #f5f5f5;">
                    <h2 style="color:#16a34a;">Merci pour votre réservation, ${nom} !</h2>
                    <p>Votre réservation a bien été enregistrée.</p>
                    <h3>Détails :</h3>
                    <ul>
                        <li><b>Date :</b> ${date}</li>
                        <li><b>Heure :</b> ${heure}</li>
                        <li><b>Départ :</b> ${depart}</li>
                        <li><b>Arrivée :</b> ${arrivee}</li>
                        <li><b>Véhicule :</b> ${vehicule || 'Non spécifié'}</li>
                        <li><b>Passagers :</b> ${passagers || '1'}</li>
                    </ul>
                    <p>Nous vous contacterons sous peu pour confirmation.</p>
                    <hr/>
                    <p style="font-size: 12px; color: gray;">MonChauffeur 2.0 – Service Premium</p>
                </div>
            `
        };

        // 3️⃣ Envoi email à l’admin
        const mailAdmin = {
            from: FROM,
            to: process.env.EMAIL_USER,
            subject: `🚘 Nouvelle réservation reçue - ${nom}`,
            html: `
                <div style="font-family: Arial; padding: 20px; background: #f9f9f9;">
                    <h2>Nouvelle Réservation</h2>
                    <p><b>Nom :</b> ${nom}</p>
                    <p><b>Téléphone :</b> ${telephone}</p>
                    <p><b>Email :</b> ${email}</p>
                    <p><b>Date :</b> ${date} à ${heure}</p>
                    <p><b>Trajet :</b> ${depart} → ${arrivee}</p>
                    <p><b>Véhicule :</b> ${vehicule || 'Non précisé'}</p>
                    <p><b>Service :</b> ${typeService || 'Standard'}</p>
                    <p><b>Détails :</b> ${details || 'Aucun détail fourni'}</p>
                    <hr/>
                    <p style="font-size: 12px; color: gray;">Notification automatique MonChauffeur 2.0</p>
                </div>
            `
        };

        // 4️⃣ Envoi des deux emails
        if (RESEND_API_KEY) {
            await sendViaResend(email, mailClient.subject, mailClient.html, email);
            await sendViaResend(process.env.EMAIL_USER, mailAdmin.subject, mailAdmin.html);
        } else if (EMAIL_ENABLED && transporter) {
            await transporter.sendMail(mailClient);
            await transporter.sendMail(mailAdmin);
        }

        console.log(`📨 Réservation de ${nom} enregistrée et emails envoyés.`);
        res.status(201).json({
            success: true,
            message: 'Réservation enregistrée et email envoyé avec succès.',
            reservationId: result.insertId
        });

    } catch (error) {
    console.error('❌ Erreur lors du traitement de la réservation:', error);
    res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de l’envoi de la réservation.',
        error: error.message, // 👈 Ajoute cette ligne
    });
    }
});

// -------------------- ROUTE GET /api/reservations --------------------
router.get('/', async (req, res) => {
    try {
        const [reservations] = await db.execute(
            'SELECT * FROM reservations ORDER BY created_at DESC'
        );
        res.json(reservations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;

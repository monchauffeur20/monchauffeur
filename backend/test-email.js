require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🔧 Configuration Email:');
console.log('📧 Email:', process.env.EMAIL_USER);
console.log('🌐 Host:', process.env.EMAIL_HOST);
console.log('🔌 Port:', process.env.EMAIL_PORT);
console.log('🔑 Password:', process.env.EMAIL_PASSWORD ? 'Défini (****)' : '❌ VIDE');
console.log('');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    },
    debug: true,
    logger: true
});

console.log('⏳ Test de connexion au serveur SMTP...');
console.log('');

transporter.verify((error, success) => {
    if (error) {
        console.log('');
        console.log('❌ ERREUR DE CONNEXION:');
        console.log('Message:', error.message);
        console.log('Code:', error.code);
        console.log('');
        console.log('💡 VÉRIFICATIONS À FAIRE:');
        console.log('1. Allez sur: https://myaccount.google.com/security');
        console.log('2. Vérifiez que "Validation en 2 étapes" est ACTIVÉE');
        console.log('3. Allez dans "Mots de passe des applications"');
        console.log('4. Créez un NOUVEAU mot de passe pour "MonChauffeur"');
        console.log('5. Copiez le mot de passe (16 caractères SANS espaces)');
        console.log('6. Remplacez dans le fichier .env');
        console.log('');
        process.exit(1);
    } else {
        console.log('');
        console.log('✅✅✅ CONNEXION SMTP RÉUSSIE ! ✅✅✅');
        console.log('');
        console.log('📤 Envoi de l\'email de test...');
        console.log('');
        
        const mailOptions = {
            from: `"MonChauffeur 2.0 Test" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: '✅ Test Réussi - MonChauffeur 2.0',
            text: 'Si vous recevez cet email, tout fonctionne !',
            html: `
                <div style="font-family: Arial; padding: 20px; background: #f5f5f5;">
                    <h1 style="color: #3b82f6;">🎉 Félicitations !</h1>
                    <p>Votre configuration email fonctionne parfaitement !</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
                    <p><strong>Serveur:</strong> ${process.env.EMAIL_HOST}</p>
                    <p><strong>Email testé:</strong> ${process.env.EMAIL_USER}</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions, (err, info) => {
            console.log('');
            if (err) {
                console.log('❌ ERREUR LORS DE L\'ENVOI:');
                console.log('Message:', err.message);
                console.log('Code:', err.code);
                console.log('');
            } else {
                console.log('✅✅✅ EMAIL ENVOYÉ AVEC SUCCÈS ! ✅✅✅');
                console.log('');
                console.log('📧 Détails:');
                console.log('   Message ID:', info.messageId);
                console.log('   Accepté:', info.accepted);
                console.log('   Rejeté:', info.rejected);
                console.log('   Réponse:', info.response);
                console.log('');
                console.log('📬 VÉRIFIEZ VOTRE EMAIL:', process.env.EMAIL_USER);
                console.log('   - Boîte de réception');
                console.log('   - Dossier SPAM/Indésirables');
                console.log('   - Peut prendre 1-2 minutes');
                console.log('');
                console.log('🎉 CONFIGURATION 100% FONCTIONNELLE !');
            }
            console.log('');
            process.exit(0);
        });
    }
});

setTimeout(() => {
    console.log('');
    console.log('⏱️ Timeout - Le test a pris trop de temps');
    process.exit(1);
}, 30000);
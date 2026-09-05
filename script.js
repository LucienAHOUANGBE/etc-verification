const sheetID = '1ykrB20xYtMvUFK2lgZ10nElaPKolcRB_k0R9FIVeoCQ'
const URL_SHEETS_CSV = `https://docs.google.com/spreadsheets/d/${sheetID}/export?format=csv`;

function getToken() {
    const token = new URLSearchParams(window.location.search).get('token')
    return token
}



function afficherStatut(texte, classe) {
    const statut = document.getElementById("statut");
    statut.textContent = texte;
    statut.className = "statut " + classe;
    statut.style.display = "block";
}

function toTitleCase (word) {
    return word
        .toLowerCase()
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
}

const dateOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
}


function formaterDate(valeurBrute) {
    const d = new Date(valeurBrute);
    if (isNaN(d)) return valeurBrute;  // date illisible -> on affiche le texte brut, pas "Invalid Date"
    return d.toLocaleDateString('fr-FR', dateOptions);
}
 

async function verifierAttestation() {
    const zoneContenu = document.getElementById("contenu-certificat");

    const chemin = window.location.pathname;
    const token = chemin.split("/verify/")[1] || new URLSearchParams(window.location.search).get("token");
    
    if (!token) {
        zoneContenu.innerHTML = `<p class="placeholder">Aucun code de vérification fourni.</p>`;
        return;
    }

    try {
        const reponse = await fetch(URL_SHEETS_CSV);
        const texteCsv = await reponse.text();
        const resultat = Papa.parse(texteCsv, { header: true, skipEmptyLines: true });
        const attestation_raw = resultat.data.find(ligne => ligne.token === token);

        if (!attestation_raw) {
            afficherStatut("❌ Attestation introuvable — aucun enregistrement ne correspond à ce code.", "invalide");
            zoneContenu.innerHTML = `<p class="placeholder">—</p>`;
            return;
        }

        if (attestation_raw.revoked === "TRUE") {
            afficherStatut("⚠️ Cette attestation a été révoquée / invalidée.", "invalide");
        }else {
            afficherStatut("✅ Attestation vérifiée et authentique.", "valide");
        }

        const attestation = {
            fist_name: attestation_raw['First Name'],
            last_name: attestation_raw['Last Name'],
            fullName: `${toTitleCase(attestation_raw['First Name'])} ${attestation_raw['Last Name']}`,
            training: {
                title: attestation_raw['Training Title'],
                duration: {
                    value: attestation_raw['Cours durée'],
                    unit: attestation_raw['Cours du durée unité']
                },
                start_date: formaterDate(attestation_raw['Date de debut']),
                end_date: formaterDate(attestation_raw['Date de cloture']),
                success_date: formaterDate(attestation_raw['Date de remise']),
                skills: (attestation_raw['skills'] || '').split(";").map(e => e.trim()).filter(Boolean),
                programm: attestation_raw['Nom du programme'],
                location: {
                    city: attestation_raw['Location'],
                    country: attestation_raw['Country']
                }
            },
            trainer: {
                full_name: `${toTitleCase(attestation_raw['Formateur Prenom'])} ${attestation_raw['Formateur Nom']}`,
                title: attestation_raw['Formateur title'],
                institution: attestation_raw['Nom du programme']
            },
            director: {
                full_name: `${toTitleCase(attestation_raw['Directeur Prenom'])} ${attestation_raw['Directeur Nom']}`,
                title: attestation_raw['Directeur Title'],
                institution: attestation_raw['Directeur Institution']
            },
            certificate_number: attestation_raw['Numero'],
            revoked: attestation_raw['revoked']

        }

        // Remplit le "certificat" avec les vraies données, comme le PDF original
        zoneContenu.innerHTML = `
            <h1>ATTESTATION DE RÉUSSITE</h1>
 
            <p>Excellent Training Center (ETC) certifie,<br>
            par l'intermédiaire du programme Econometrics and Data Analysis (EcoDA), que</p>
 
            <h2 class="student-name">${attestation.fullName}</h2>
 
            <p class="italic">a suivi avec succès et validé la formation</p>
 
            <h3 class="training-name">${attestation.training.title}</h3>
 
            <p>Durée : ${attestation.training.duration.value} ${attestation.training.duration.unit}</p>
            <p>Période :<br> ${attestation.training.start_date} – ${attestation.training.end_date}</p>
 
            ${attestation.training.skills.length ? `
            <div class="skills">
                <p class="skills-label">Compétences validées</p>
                <div class="skills-tags">
                    ${attestation.training.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
                </div>
            </div>
            ` : ''}
 
            <!-- Pied de page : signatures -->
            <div class="footer">
                <div class="signature-block trainer">
                    <hr>
                    <p class="name">${attestation.trainer.full_name}</p>
                    <p>${attestation.trainer.title}</p>
                    <p>${attestation.trainer.institution}</p>
                </div>
 
                <!-- Ligne date + lieu -->
                <div class="location-date">
                    <hr>
                    <p>${attestation.training.location.city} - ${attestation.training.location.country}, le ${attestation.training.success_date}</p>
                </div>
 
                <div class="signature-block director">
                    <hr>
                    <p class="name">${attestation.director.full_name}</p>
                    <p>${attestation.director.title}</p>
                    <p>${attestation.director.institution}</p>
                </div>
            </div>
 
            <div class="certificate-number">
                Numéro : ${attestation.certificate_number}
            </div>

        `;
    } catch (erreur) {
        afficherStatut("❌ Erreur technique lors de la vérification.", "invalide");
        console.error(erreur);
    }
}

verifierAttestation();
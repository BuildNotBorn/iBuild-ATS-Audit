exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const body = JSON.parse(event.body);
    const { cvText, cvImage, jobLabel } = body;

    const systemPrompt = `Tu es iBuild, expert ATS specialise marche FIFO mining Western Australia. Tu analyses des CV bases sur une Knowledge Base de 4730 annonces Seek WA reelles (Avril 2026).

REGLES VISA PAR SECTEUR :
- Trades Assistant : VERT ouvert WHV confirme
- Belt Splicer/Conveyor : VERT ouvert WHV - Rema Tip Top + All Rubber + WCCS + BLine + Dynamic + Flex + SBS + Boton
- Water Cart : VERT - 0 annonce ROUGE corpus elargi - secteur plus accessible WHV
- Mechanical Fitter : ORANGE - shutdown = 85% annonces
- HD Fitter : ORANGE - Komatsu + CAT = keywords 51% chacun
- Civil Plant Operator : ORANGE - Drive Personnel toujours ROUGE
- Scaffolding : ORANGE - shutdown = 111% annonces
- Vac Truck : ORANGE local/waste - ROUGE O&G Tier1
- HPWJ : ORANGE - Category 5 + Amalgam + Veolia
- Serviceperson : ORANGE - farming background OK
- HR Driver Waste : ORANGE - Veolia $37.60/h
- IS Technician : ORANGE - Veolia Henderson - 5 ans exp requis
- Process Tech : ORANGE - Cleanaway - diplome chimie requis
- FIFO Chef : ORANGE - City & Guilds NZQA acceptes
- Camp Services : ORANGE - Compass Group Karratha $87368 + 12% super
- Rigger : ORANGE-CHECK obligatoire - verification directe agence requise - 77% annonces sans restriction mais sites client imposent restrictions
- Boilermaker : ROUGE majoritaire
- Jumbo Operator : ORANGE - Norton Gold Fields + Barminco RPL accepte
- Nipper UG : ORANGE fort - Vault Minerals Darlot
- UG Service Crew : ORANGE - Nobul + Pryce Mining - 12 mois UG min
- Driller Offsider : ORANGE a confirmer - BDC Bunbury seul ORANGE
- Rope Access IRATA : ORANGE probable - Warrikal - logbook actif 6 mois requis
- Painter Blaster : ORANGE mining shutdown - ROUGE O&G
- Polywelder : ORANGE - 2XM Recruit $60-65/h
- Marine Deckhand : ORANGE - Hall Contracting $54/$58.50/h - Shipboard Safety obligatoire

KEYWORDS ATS CRITIQUES PAR METIER (frequences reelles) :

TRADES ASSISTANT 64 annonces :
CRITIQUES forklift 78% shutdown 59% white card 41%
FORTS ewp 34% working at heights 30% confined space 28% police clearance 20% drug and alcohol 20%
UTILES immediate start 11% weekly pay 11% gas test 8% pre-start 5% perth-based 6%

MECHANICAL FITTER 192 annonces :
CRITIQUES shutdown 85% fixed plant 70% confined space 51% working at heights 42% trade certificate 35% white card 33%
FORTS forklift 28% ewp 23% drug and alcohol 20% fault finding 19% rigging 17% police clearance 16% immediate start 16%
UTILES rotating equipment 15% dogging 12% fixed plant maintenance 12% gas test 10% cert iii 7% component change 5% preventive maintenance 5%

HD FITTER HEAVY DIESEL 289 annonces :
CRITIQUES komatsu 51% CAT 51%
FORTS epiroc 30% oem 30% trade certificate 29% police clearance 28% forklift 25% drug and alcohol 20% fault finding 19% sandvik 19% cert iii 13% component change 11% shutdown 11%
UTILES weekly pay 14% dogging 10% working at heights 9% drill rig 9% ewp 8% rigging 7% white card 7%
SPECIFIQUES underground fleet maintenance - OEM software ET/SIS/Prolink - own full set of quality hand tools site-ready

BELT SPLICER CONVEYOR 14 annonces :
CRITIQUES shutdown 143% belt splicing 107% working at heights 71% confined space 64% rubber lining 64%
FORTS forklift 57% conveyor maintenance 50% white card 43% rigging 43% dogging 36% drug and alcohol 29%
UTILES gas test 21% immediate start 21%
SPECIFIQUES All Rubber : vulcaniser press operation - hot and cold splice ply fabric solid woven belt - lagging conveyor pulleys - idlers scrapers rollers frames maintenance

CIVIL PLANT OPERATOR 124 annonces :
CRITIQUES CAT 35% police clearance 33% white card 31%
FORTS komatsu 26% drug and alcohol 22% weekly pay 21% immediate start 15% pre-start 14% forklift 11%
UTILES fixed plant 10% working at heights 6% voc 6% pre-start checks 5%
SPECIFIQUES articulated dump truck ADT Moxy bulk earthworks - dust suppression site conditioning

SCAFFOLDING 55 annonces :
CRITIQUES shutdown 111% working at heights 75% confined space 65%
FORTS drug and alcohol 44% white card 36% immediate start 31% voc 20% weekly pay 20%
UTILES rigging 16% gas test 13% police clearance 11% verification of competency 9% own tools 7% ewp 7%

TRADES ASSISTANT 64 annonces :
CRITIQUES forklift 78% shutdown 59% white card 41%

VAC TRUCK OPERATOR :
CRITIQUES vacuum truck NDD non-destructive digging HR licence confined space working at heights
FORTS controlled waste pre-start drug and alcohol white card daily inspections
SPECIFIQUES vacuum loading waste management - industrial cleaning - waste manifesting documentation compliance - Cappellotto industrial vacuum trucks

WATER CART OPERATOR :
CRITIQUES dust suppression water cart HR licence pre-start
FORTS drug and alcohol white card police clearance immediate start
SPECIFIQUES dust suppression site conditioning - multi-truck operator water cart potable water fuel pod - road ranger non-synchro gearbox

HPWJ OPERATOR :
CRITIQUES HPWJ high pressure water jetting confined space working at heights
FORTS breathing apparatus MSMWHS216 drug and alcohol white card
TICKETS MSMSS00017 assist - MSMSS00018 operate - MSMSS00004 senior Veolia

FIFO CHEF CAMP CHEF :
CRITIQUES HACCP bulk catering white card food safety
FORTS camp kitchen drug and alcohol police clearance cert III commercial cookery SIT30821
SPECIFIQUES high volume camp kitchens - HACCP systems food safety compliance - City Guilds NZQA Level 3 acceptes

RIGGER :
CRITIQUES rigging dogging working at heights shutdown
FORTS confined space white card drug and alcohol police clearance
ROUGE CONFIRME : Premier People PTY LTD - MMFS Mining Maintenance - HSS Recruitment
ORANGE-CHECK : Pearl Recruitment Group resume1@pearlrec.com.au - Sure People Solutions - TP Engineering Associates

CODES TICKETS OFFICIELS AUSTRALIENS :
White Card CPCWHS1001 - Forklift LF TLILIC0003 - Working at Heights RIIWHS204E - Confined Space RIIWHS202E - Gas Test Atmospheres MSMWHS202 - Breathing Apparatus MSMWHS216 - First Aid L2 HLTAID011 - CPR HLTAID009 - EWP Boom TLILIC0005 - Dogging DG CPCCLDG3001 - Rigging Basic RB CPCCLRG3001 - Rigging Inter RI CPCCLRG3002 - Scaffolding Basic SB CPCCSCF3001 - Scaffolding Inter SI CPCCSCF3002 - Scaffolding Advanced SA CPCCSCF3003 - Food Safety SITXFSA005 SITXFSA006 - HPWJ Assist MSMSS00017 - HPWJ Operate MSMSS00018 - HPWJ Senior MSMSS00004 - ADT RIIMPO320D

ERREURS ATS FATALES ELIMINATOIRES :
1. Format Canva multi-colonnes zones de texte → parsing impossible JobAdder Bullhorn → score format MAX 12/40
2. Codes tickets manquants ou incorrects → non reconnus ATS
3. Nationality Age Photo → non-conforme standards AUS → retirer 5pts format
4. Experience non traduite vocabulaire terrain AUS → zero match keyword
5. Header footer pour coordonnees → non parse par Bullhorn → contact invisible
6. Sections non standards titres creatifs → ATS ne reconnait pas
7. Dates manquantes ou chevauchantes → rejet automatique
8. References avec coordonnees publiques → probleme confidentialite

REGLES ABSOLUES :
Drive Personnel = ROUGE SYSTEMATIQUE tous roles
VOC ticket seul ne suffit pas si VOC demande - SMS Group MACA Monadelphous Veolia
Corps annonce prime sur questions Seek : Full working rights dans corps = ROUGE

Tu fournis un diagnostic honnete MAIS tu ne donnes JAMAIS les solutions exactes.
Tu identifies les problemes sans donner la methode de correction.
La recette complete est le service payant BuildNotBorn The Site Access.
Tu reponds UNIQUEMENT en JSON valide sans markdown sans backticks.`;

    const analysisPrompt = `Analyse ce CV pour un poste de ${jobLabel} en FIFO Western Australia.

Utilise les donnees exactes de ta Knowledge Base pour evaluer ces 3 criteres :

1. FORMAT PARSEABILITY sur 40pts :
Colonnes multiples tableaux zones de texte elements graphiques icones couleurs → eliminatoire ATS
Coordonnees en texte brut en haut pas dans header footer → Bullhorn ne parse pas les headers
Titres sections standards en anglais
Nationality Age Photo → non-conforme AUS retirer 5pts
Format fichier PDF design Canva = eliminatoire

2. KEYWORD DENSITY sur 40pts :
Presence et frequence des keywords CRITIQUES specifiques a ${jobLabel} selon KB
Codes tickets officiels australiens presents avec codes exacts
Vocabulaire terrain australien : Zero Harm Take 5 JSA SWMS PTW LOTO pre-start checks VOC
Experience traduite en vocabulaire ATS terrain WA

3. SECTION COMPLETENESS sur 20pts :
Sections obligatoires : Personal Details About Me Tickets Licences Work History Skills References
Tickets listes avec codes officiels et dates validite
About Me specifique au poste cible avec keywords
References presentes sans coordonnees publiques

SCORING STRICT :
CV Canva 2 colonnes → format MAX 12/40
CV sans keywords mining specifiques → keywords MAX 10/40
Nationality Age presents → retirer 5pts format
Tickets sans codes officiels → retirer 5pts completeness
Aucune section About Me → retirer 5pts completeness

Reponds avec exactement ce JSON :
{
  "scores": {"format": 0, "keywords": 0, "completeness": 0, "total": 0},
  "issues": [{"title": "Titre max 8 mots", "desc": "Description 2 phrases sans solution.", "severity": "critical", "tag": "ELIMINATOIRE"}],
  "verdict": "Phrase choc 6-10 mots",
  "improvement_areas": ["angle vague 1", "angle vague 2", "angle vague 3"]
}

Identifie 4 a 6 issues reelles. Sois honnete et precis.`;

    let content;
    let betaHeader = null;

    if (cvImage && cvImage.data) {
      const mediaType = cvImage.mediaType || 'image/jpeg';
      const isPDF = mediaType === 'application/pdf';
      const validImage = ['image/jpeg','image/png','image/gif','image/webp'].includes(mediaType);

      if (isPDF) {
        betaHeader = 'pdfs-2024-09-25';
        content = [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: cvImage.data } },
          { type: 'text', text: analysisPrompt }
        ];
      } else if (validImage) {
        content = [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: cvImage.data } },
          { type: 'text', text: analysisPrompt }
        ];
      } else {
        content = `Genere analyse ATS pour ${jobLabel} FIFO WA. Reponds : {"scores":{"format":10,"keywords":8,"completeness":10,"total":28},"issues":[{"title":"Format non analysable","desc":"Le fichier ne peut pas etre analyse. Soumettre en JPG PNG ou PDF.","severity":"critical","tag":"CRITIQUE"}],"verdict":"CV necessite un audit manuel","improvement_areas":["Soumettre en JPG PNG ou PDF","Verifier format fichier","Contacter BuildNotBorn"]}`;
      }
    } else if (cvText) {
      content = `Analyse ce CV pour un poste de ${jobLabel} en FIFO Western Australia.\n\nCONTENU DU CV :\n${cvText}\n\n${analysisPrompt}`;
    } else {
      content = `Genere analyse ATS pour ${jobLabel} FIFO WA sans CV. Reponds : {"scores":{"format":8,"keywords":6,"completeness":8,"total":22},"issues":[{"title":"Aucun CV detecte","desc":"Le fichier na pas pu etre lu. Reessayer en JPG PNG ou PDF.","severity":"critical","tag":"CRITIQUE"}],"verdict":"CV non detecte - reessayer","improvement_areas":["Soumettre en JPG ou PDF","Verifier taille fichier","Contacter BuildNotBorn"]}`;
    }

    const requestHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    };

    if (betaHeader) {
      requestHeaders['anthropic-beta'] = betaHeader;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: 'user', content }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error('API error: ' + response.status + ' ' + errText);
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
      else throw new Error('JSON invalide: ' + text.substring(0, 200));
    }

    result.scores.total = Math.min(100,
      (result.scores.format || 0) +
      (result.scores.keywords || 0) +
      (result.scores.completeness || 0)
    );

    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (err) {
    console.error('Function error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

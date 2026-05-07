const mammoth = require('mammoth');

exports.handler = async (event) => {
  console.log('BODY LENGTH:', event.body ? event.body.length : 'null');
  console.log('BODY START:', event.body ? event.body.substring(0, 200) : 'null');

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

  let rawText = 'NOT_YET_ASSIGNED';

  try {
    const body = JSON.parse(event.body);
    const { cvText, cvImage, cvDocx, jobLabel } = body;

    const systemPrompt = `Tu es un expert ATS specialise dans le marche FIFO mining Western Australia. Tu analyses des CV de candidats WHV francophones qui veulent entrer dans le mining australien. Ton analyse est basee sur 4700+ annonces Seek WA reelles.

REGLES DE LANGAGE ABSOLUES :
- Ecris comme si tu parlais a quelqu un qui ne connait pas les RH ni les ATS
- Zero jargon technique sans explication : si tu ecris "ATS" dis aussi "logiciel de tri automatique"
- Phrases courtes. Maximum 2 phrases par description.
- Ton direct, sans condescendance. Pas de "malheureusement", pas de "il serait preferable"
- La premiere phrase dit LE PROBLEME CONCRET. La deuxieme dit POURQUOI CA BLOQUE.

REGLE ABSOLUE SUR LES SOLUTIONS :
- Tu identifies les problemes avec precision et honnetete
- Tu nommes exactement ce qui cloche
- Tu ne donnes JAMAIS la solution exacte ni les etapes pour corriger
- La solution complete est dans The Site Access ou en DM @BuildNotBorn.FiFo

SEVERITE — utilise exactement ces valeurs :
- "critical" + tag "BLOQUANT" : le CV est rejete automatiquement a cause de ca
- "warning" + tag "A CORRIGER" : reduit fortement les chances, pas eliminatoire
- "minor" + tag "OPTIMISATION" : impact moindre mais corrigeable facilement

Tu reponds UNIQUEMENT avec un objet JSON sur UNE SEULE LIGNE. Zero saut de ligne dans les strings. Zero markdown. Zero backticks. Zero texte avant ou apres le JSON.`;

    const analysisPrompt = `Analyse ce CV pour un poste de ${jobLabel} en FIFO Western Australia.

Evalue sur 3 criteres :
1. FORMAT PARSEABILITY sur 40pts : colonnes multiples, tableaux, elements graphiques, icones, couleurs, mise en page complexe, template Canva
2. KEYWORD DENSITY sur 40pts : keywords critiques pour ${jobLabel} mining WA, vocabulaire terrain australien, codes tickets officiels, ANZSCO
3. SECTION COMPLETENESS sur 20pts : sections obligatoires, tickets avec codes, experience pertinente, references australiennes

CV Canva 2 colonnes = format automatiquement inferieur a 15 sur 40 en format.

Identifie 4 a 6 problemes reels et specifiques a CE CV.

REGLES DE REDACTION DES PROBLEMES :
- title : nom du probleme en langage simple, 6-10 mots max, pas de jargon seul
- desc : 2 phrases max. Phrase 1 = ce qui est concretement absent ou casse dans CE CV. Phrase 2 = pourquoi ca bloque dans le processus de recrutement FIFO WA. Pas de solution. Pas d etapes.
- Exemples de DESC CORRECTS : "Ton CV utilise 2 colonnes — un robot de tri lit ca de haut en bas et rate la moitie de tes infos." / "Tes tickets sont listes sans leurs codes officiels — les logiciels RH filtrent sur les codes exacts, pas les noms."
- Exemples INTERDITS : "Ajoute le code CPCCWHS1001" / "Convertis en format une colonne" / "Il serait recommande de..."

REGLES POUR improvement_areas :
- 3 zones max
- Format : "Ce que ca concerne (sans solution) — details dans The Site Access"
- Exemple correct : "Restructuration complete du format pour etre lu par les ATS — details dans The Site Access"
- Exemple interdit : "Convertir en une colonne en supprimant les zones laterales"

Reponds avec exactement ce JSON :
{
  "scores": {"format": 12, "keywords": 8, "completeness": 10, "total": 30},
  "issues": [
    {
      "title": "Titre simple et direct",
      "desc": "Phrase 1 concrete sur CE CV. Phrase 2 sur pourquoi ca bloque.",
      "severity": "critical",
      "tag": "BLOQUANT"
    }
  ],
  "verdict": "Phrase choc 6-10 mots sans jargon",
  "improvement_areas": [
    "Zone identifiee sans solution — details dans The Site Access",
    "Zone identifiee sans solution — details dans The Site Access",
    "Zone identifiee sans solution — details dans The Site Access"
  ]
}

Sois honnete et specifique. Ne flatte pas. Parle comme a un ami, pas comme a un RH.`;

    let content;

    if (cvDocx && cvDocx.data) {
      try {
        const buffer = Buffer.from(cvDocx.data, 'base64');
        const result = await mammoth.extractRawText({ buffer });
        const extractedText = result.value;
        content = `Analyse ce CV pour un poste de ${jobLabel} en FIFO Western Australia. CONTENU EXTRAIT DU DOCX : ${extractedText}. ${analysisPrompt}`;
      } catch (e) {
        content = `Analyse ce CV pour un poste de ${jobLabel} FIFO WA. Le fichier DOCX na pas pu etre extrait. Reponds : {"scores":{"format":10,"keywords":8,"completeness":10,"total":28},"issues":[{"title":"Fichier DOCX impossible a lire","desc":"Le document soumis ne peut pas etre ouvert. Les logiciels de tri automatique ont le meme probleme avec les fichiers corrompus.","severity":"critical","tag":"BLOQUANT"}],"verdict":"CV illisible - audit manuel requis","improvement_areas":["Format du fichier a verifier avant soumission — details dans The Site Access","Soumettre en PDF ou JPG pour eviter ce probleme — details dans The Site Access","DM @BuildNotBorn.FiFo pour audit manuel"]}`;
      }

    } else if (cvImage && cvImage.data) {
      const mediaType = cvImage.mediaType || 'image/jpeg';
      const isPDF = mediaType === 'application/pdf';
      const validImage = ['image/jpeg','image/png','image/gif','image/webp'].includes(mediaType);

      if (isPDF) {
        content = [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: cvImage.data }
          },
          { type: 'text', text: analysisPrompt }
        ];
      } else if (validImage) {
        content = [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: cvImage.data }
          },
          { type: 'text', text: analysisPrompt }
        ];
      } else {
        content = `Genere une analyse ATS type pour un poste de ${jobLabel} FIFO WA. Reponds : {"scores":{"format":10,"keywords":8,"completeness":10,"total":28},"issues":[{"title":"Format de fichier non reconnu","desc":"Le fichier envoye ne peut pas etre lu. Les logiciels de tri automatique rejettent aussi les formats non standard.","severity":"critical","tag":"BLOQUANT"}],"verdict":"Format invalide - reessayer en JPG ou PDF","improvement_areas":["Format du fichier a corriger avant soumission — details dans The Site Access","Soumettre en JPG, PNG ou PDF uniquement — details dans The Site Access","DM @BuildNotBorn.FiFo pour aide"]}`;
      }

    } else if (cvText) {
      content = `Analyse ce CV pour un poste de ${jobLabel} en FIFO Western Australia. CONTENU : ${cvText}. ${analysisPrompt}`;

    } else {
      content = `Genere une analyse ATS type pour un poste de ${jobLabel} FIFO WA sans CV fourni. Reponds : {"scores":{"format":8,"keywords":6,"completeness":8,"total":22},"issues":[{"title":"Aucun CV detecte dans l envoi","desc":"Le fichier na pas pu etre lu par le systeme. Reessayer en JPG, PNG ou PDF de moins de 5MB.","severity":"critical","tag":"BLOQUANT"}],"verdict":"CV non detecte - reessayer","improvement_areas":["Format du fichier a verifier — details dans The Site Access","Taille du fichier a reduire si necessaire — details dans The Site Access","DM @BuildNotBorn.FiFo pour aide"]}`;
    }

    const requestHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      throw new Error('API error ' + response.status + ': ' + errText);
    }

    const data = await response.json();
    rawText = data.content[0].text.trim();
    console.log('RAW HAIKU RESPONSE:', rawText.substring(0, 800));

    // Sanitise tous les caracteres qui cassent JSON.parse
    const text = rawText
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\t/g, ' ');

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          result = JSON.parse(match[0]);
        } catch (e2) {
          console.error('JSON brut:', text.substring(0, 500));
          throw new Error('JSON invalide apres sanitisation: ' + e2.message);
        }
      } else {
        console.error('JSON brut:', text.substring(0, 500));
        throw new Error('Aucun JSON detecte dans la reponse');
      }
    }

    result.scores.total = Math.min(100,
      (result.scores.format || 0) +
      (result.scores.keywords || 0) +
      (result.scores.completeness || 0)
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (err) {
    console.error('Function error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};

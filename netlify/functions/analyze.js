const mammoth = require('mammoth');

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
    const { cvText, cvImage, cvDocx, jobLabel } = body;

    const systemPrompt = `Tu es un expert ATS specialise dans le marche FIFO mining Western Australia. Tu analyses des CV de candidats visant des postes FIFO en Australie. Tu connais parfaitement JobAdder, Bullhorn et Workday. Ton analyse est basee sur 4700+ annonces Seek WA reelles.

REGLE ABSOLUE SUR LES TIPS ET SOLUTIONS :
- Tu IDENTIFIES les problemes avec precision et honnetetee
- Tu NOMMES exactement ce qui cloche (colonne, tableau, keyword manquant, section absente)
- Tu NE DONNES JAMAIS la solution exacte ni les etapes pour corriger
- Chaque issue doit donner envie d'en savoir plus SANS resoudre le probleme
- Le but : le candidat comprend QUE il a un probleme, pas COMMENT le regler
- La solution complete est disponible via The Site Access ou en DM Instagram @BuildNotBorn.FiFo

Tu reponds UNIQUEMENT en JSON valide sans markdown sans backticks.`;

    const analysisPrompt = `Analyse ce CV pour un poste de ${jobLabel} en FIFO Western Australia.

Evalue sur 3 criteres :
1. FORMAT PARSEABILITY sur 40pts : colonnes multiples tableaux elements graphiques icones couleurs mise en page complexe template Canva
2. KEYWORD DENSITY sur 40pts : keywords critiques pour ${jobLabel} mining WA vocabulaire terrain australien codes tickets officiels ANZSCO
3. SECTION COMPLETENESS sur 20pts : sections obligatoires tickets avec codes experience pertinente references australiennes

Identifie 4 a 6 issues reelles et specifiques a CE CV.

REGLES POUR LES DESCRIPTIONS D'ISSUES :
- Dis clairement CE QUI MANQUE ou CE QUI POSE PROBLEME
- Ne donne PAS la solution ni les etapes de correction
- Termine chaque desc par une phrase qui donne envie d'agir (ex: "Ce point seul peut couter la candidature.")
- Exemples corrects : "Aucun code ticket officiel detecte — les ATS filtrent sur les codes exacts, pas les noms." / "Mise en page multi-colonnes detectee — ce format est invisible pour 80% des ATS mining WA."
- Exemples INTERDITS : "Ajoute le code CPCCWHS1001" / "Convertis en format une colonne"

CV Canva 2 colonnes = format inferieur a 15.

Reponds avec exactement ce JSON :
{
  "scores": {"format": 12, "keywords": 8, "completeness": 10, "total": 30},
  "issues": [
    {
      "title": "Titre du probleme precis",
      "desc": "Description du probleme en 2 phrases. Pas de solution. Phrase d impact finale.",
      "severity": "critical",
      "tag": "CRITIQUE"
    }
  ],
  "verdict": "Phrase choc 6-10 mots",
  "improvement_areas": [
    "Zone identifiee sans solution — voir The Site Access",
    "Zone identifiee sans solution — voir The Site Access",
    "Zone identifiee sans solution — voir The Site Access"
  ]
}

Sois honnete et specifique. Ne flatte pas.`;

    let content;

    if (cvDocx && cvDocx.data) {
      try {
        const buffer = Buffer.from(cvDocx.data, 'base64');
        const result = await mammoth.extractRawText({ buffer });
        const extractedText = result.value;
        content = `Analyse ce CV pour un poste de ${jobLabel} en FIFO Western Australia. CONTENU EXTRAIT DU DOCX : ${extractedText}. ${analysisPrompt}`;
      } catch (e) {
        content = `Analyse ce CV pour un poste de ${jobLabel} FIFO WA. Le fichier DOCX na pas pu etre extrait. Reponds : {"scores":{"format":10,"keywords":8,"completeness":10,"total":28},"issues":[{"title":"Fichier DOCX non lisible","desc":"Le document soumis ne peut pas etre parse. Les ATS ont le meme probleme avec les DOCX corrompus.","severity":"critical","tag":"CRITIQUE"}],"verdict":"CV necessite un audit manuel","improvement_areas":["Soumettre en PDF ou JPG","Verifier le format du fichier","DM @BuildNotBorn.FiFo pour audit"]}`;
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
        content = `Genere une analyse ATS type pour un poste de ${jobLabel} FIFO WA. Reponds : {"scores":{"format":10,"keywords":8,"completeness":10,"total":28},"issues":[{"title":"Format non analysable","desc":"Le fichier fourni ne peut pas etre analyse. Les ATS rejettent aussi les formats non standard.","severity":"critical","tag":"CRITIQUE"}],"verdict":"CV necessite un audit manuel","improvement_areas":["Soumettre en JPG PNG ou PDF","Verifier le format","DM @BuildNotBorn.FiFo"]}`;
      }

    } else if (cvText) {
      content = `Analyse ce CV pour un poste de ${jobLabel} en FIFO Western Australia. CONTENU : ${cvText}. ${analysisPrompt}`;

    } else {
      content = `Genere une analyse ATS type pour un poste de ${jobLabel} FIFO WA sans CV fourni. Reponds : {"scores":{"format":8,"keywords":6,"completeness":8,"total":22},"issues":[{"title":"Aucun CV detecte","desc":"Le fichier na pas pu etre lu. Reessayer en JPG, PNG ou PDF.","severity":"critical","tag":"CRITIQUE"}],"verdict":"CV non detecte - reessayer","improvement_areas":["Soumettre en format JPG ou PDF","Verifier la taille du fichier","DM @BuildNotBorn.FiFo"]}`;
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

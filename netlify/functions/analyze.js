const mammoth = require('mammoth');
async function checkRateLimit(ip) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const key = `ratelimit:${ip}`;
  
  const getRes = await fetch(`${url}/get/${key}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const getData = await getRes.json();
  const count = parseInt(getData.result) || 0;
  
  if (count >= 1) return false;
  
  await fetch(`${url}/set/${key}/1/ex/2592000`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return true;
}

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

  const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ error: 'rate_limit' })
    };
  }

  let rawText = 'NOT_YET_ASSIGNED';

  try {
    const body = JSON.parse(event.body);
    const { cvImage, cvPdf, cvDocx, jobLabel } = body;

    const systemPrompt = `Tu es un expert ATS spécialisé dans le marché FIFO mining Western Australia. Tu analyses des CV de candidats WHV francophones qui veulent entrer dans le mining australien. Ton analyse est basée sur 4700+ annonces Seek WA réelles.

RÈGLES DE LANGAGE ABSOLUES :
- Écris comme si tu parlais à quelqu'un qui ne connaît pas les RH ni les ATS
- Zéro jargon technique sans explication : si tu écris "ATS" dis aussi "logiciel de tri automatique"
- Phrases courtes. Maximum 2 phrases par description.
- Ton direct, sans condescendance. Pas de "malheureusement", pas de "il serait préférable"
- La première phrase dit LE PROBLÈME CONCRET. La deuxième dit POURQUOI ÇA BLOQUE.

RÈGLE ABSOLUE SUR LES SOLUTIONS :
- Tu identifies les problèmes avec précision et honnêteté
- Tu nommes exactement ce qui cloche
- Tu ne donnes JAMAIS la solution exacte ni les étapes pour corriger
- La solution complète est dans The Site Access ou en DM @BuildNotBorn.FiFo

SÉVÉRITÉ — utilise exactement ces valeurs :
- "critical" + tag "BLOQUANT" : le CV est rejeté automatiquement à cause de ça
- "warning" + tag "À CORRIGER" : réduit fortement les chances, pas éliminatoire
- "minor" + tag "OPTIMISATION" : impact moindre mais corrigeable facilement

ORTHOGRAPHE OBLIGATOIRE : utilise le français complet avec tous les accents (é, è, ê, à, ù, û, ô, î, ç) dans TOUTES les valeurs du JSON — title, desc, verdict, improvement_areas.

Tu réponds UNIQUEMENT avec un objet JSON sur UNE SEULE LIGNE. Zéro saut de ligne dans les strings. Zéro markdown. Zéro backticks. Zéro texte avant ou après le JSON.`;

    const analysisPrompt = `Analyse ce CV pour un poste de ${jobLabel} en FIFO Western Australia.

Évalue sur 3 critères :
1. FORMAT PARSEABILITY sur 40pts : colonnes multiples, tableaux, éléments graphiques, icônes, couleurs, mise en page complexe, template Canva
2. KEYWORD DENSITY sur 40pts : keywords critiques pour ${jobLabel} mining WA, vocabulaire terrain australien, codes tickets officiels, ANZSCO
3. SECTION COMPLETENESS sur 20pts : sections obligatoires, tickets avec codes, expérience pertinente, références australiennes

CV Canva 2 colonnes = format automatiquement inférieur à 15 sur 40 en format.
Un CV Word ou PDF une colonne sobre sans graphiques peut scorer 30-38 sur 40 en format.
Ne pénalise PAS ce qui n'est pas visible dans le CV — note uniquement ce qui est réellement problématique.

Identifie 4 à 6 problèmes réels et spécifiques à CE CV.

RÈGLES DE RÉDACTION DES PROBLÈMES :
- title : nom du problème en langage simple, 6-10 mots max, pas de jargon seul
- desc : 2 phrases max. Phrase 1 = ce qui est concrètement absent ou cassé dans CE CV. Phrase 2 = pourquoi ça bloque dans le processus de recrutement FIFO WA. Pas de solution. Pas d'étapes.
- Exemples de DESC CORRECTS : "Ton CV utilise 2 colonnes — un robot de tri lit ça de haut en bas et rate la moitié de tes infos." / "Tes tickets sont listés sans leurs codes officiels — les logiciels RH filtrent sur les codes exacts, pas les noms."
- Exemples INTERDITS : "Ajoute le code CPCCWHS1001" / "Convertis en format une colonne" / "Il serait recommandé de..." / citer un code ticket inventé (WH-00, WHMIS, etc.)
- RÈGLE ABSOLUE CODES : tu n'as pas accès à une base de données de codes tickets. Ne cite JAMAIS un code (CPCCWHS1001, RIIHAN301E, etc.) que tu n'as pas lu mot pour mot dans le CV soumis. Si les codes sont absents, écris uniquement "codes officiels absents du CV" — zéro invention, zéro exemple.
RÈGLES POUR improvement_areas :
- 3 zones max
- Format : "Ce que ça concerne (sans solution) — détails dans The Site Access"
- Exemple correct : "Restructuration complète du format pour être lu par les ATS — détails dans The Site Access"
- Exemple interdit : "Convertir en une colonne en supprimant les zones latérales"

Réponds avec exactement ce JSON :
{
  "scores": {"format": 12, "keywords": 8, "completeness": 10, "total": 30},
  "issues": [
    {
      "title": "Titre simple et direct avec accents",
      "desc": "Phrase 1 concrète sur CE CV. Phrase 2 sur pourquoi ça bloque.",
      "severity": "critical",
      "tag": "BLOQUANT"
    }
  ],
  "verdict": "Phrase choc 6-10 mots avec accents français",
  "improvement_areas": [
    "Zone identifiée sans solution — détails dans The Site Access",
    "Zone identifiée sans solution — détails dans The Site Access",
    "Zone identifiée sans solution — détails dans The Site Access"
  ]
}

Sois honnête et spécifique. Ne flatte pas. Parle comme à un ami, pas comme à un RH.`;

    let content;

    if (cvDocx) {
      try {
        const buffer = Buffer.from(cvDocx, 'base64');
        const result = await mammoth.extractRawText({ buffer });
        const extractedText = result.value;
        content = `Analyse ce CV pour un poste de ${jobLabel} en FIFO Western Australia. CONTENU EXTRAIT DU DOCX : ${extractedText}. ${analysisPrompt}`;
      } catch (e) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            global_score: 0,
            scores: { format: 0, keywords: 0, completeness: 0 },
            issues: [{ title: "Fichier DOCX impossible à lire", desc: "Le document soumis ne peut pas être ouvert par le système. Les logiciels ATS ont le même problème avec les fichiers corrompus ou mal exportés.", severity: "critical", tag: "BLOQUANT" }],
            verdict: "CV illisible — audit manuel requis"
          })
        };
      }

    } else if (cvPdf) {
      // Vérifie la signature PDF (%PDF- en base64 = JVBER)
      if (!cvPdf.trimStart().startsWith('JVBER')) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            global_score: 0,
            scores: { format: 0, keywords: 0, completeness: 0 },
            issues: [{ title: "Fichier PDF corrompu ou invalide", desc: "Le fichier envoyé n'est pas un PDF lisible. Les logiciels ATS rejettent automatiquement les fichiers qu'ils ne peuvent pas ouvrir.", severity: "critical", tag: "BLOQUANT" }],
            verdict: "Fichier illisible — réessaie en PDF valide"
          })
        };
      }
      content = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: cvPdf } },
        { type: 'text', text: analysisPrompt }
      ];

    } else if (cvImage) {
      // Détecte le type image depuis la signature base64
      let mediaType = 'image/jpeg';
      if (cvImage.startsWith('iVBOR')) mediaType = 'image/png';
      else if (cvImage.startsWith('R0lGO')) mediaType = 'image/gif';
      else if (cvImage.startsWith('UklGR')) mediaType = 'image/webp';
      content = [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: cvImage } },
        { type: 'text', text: analysisPrompt }
      ];

    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          global_score: 0,
          scores: { format: 0, keywords: 0, completeness: 0 },
          issues: [{ title: "Aucun CV détecté dans l'envoi", desc: "Le fichier n'a pas pu être lu par le système. Réessaie en JPG, PNG ou PDF de moins de 5 MB.", severity: "critical", tag: "BLOQUANT" }],
          verdict: "CV non détecté — réessaie"
        })
      };
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
      // PDF corrompu : Anthropic retourne 400 quand il ne peut pas parser le document
      const isPDFContent = Array.isArray(content) && content[0]?.type === 'document';
      if (isPDFContent && (response.status === 400 || response.status === 422)) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            global_score: 0,
            scores: { format: 0, keywords: 0, completeness: 0 },
            issues: [{ title: "PDF impossible à lire par l'analyseur", desc: "Le contenu de ton PDF ne peut pas être extrait. C'est souvent dû à un PDF scanné sans OCR, protégé par mot de passe, ou mal généré.", severity: "critical", tag: "BLOQUANT" }],
            verdict: "PDF illisible — essaie en JPG ou DOCX"
          })
        };
      }
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
    result.global_score = result.scores.total;

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
